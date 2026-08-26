import { DeploymentType, ResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  resolveCourseBoundEvaluationEligibility,
  toCourseBoundEvaluationEligibilityAssignment,
} from "@/features/course-assignments/services/course-assignment-roster";
import { parseStudentEvaluationAnswerKey } from "@/features/responses/answer-keys";
import {
  isCourseBoundEvaluationAvailable,
  STUDENT_EVALUATION_UNAVAILABLE_ERROR,
} from "./course-bound-availability";
import { lockResponseSubmission } from "./lock-response-submission";

type StructureSnapshotItem = {
  key: string;
  kind?: "quantitative" | "qualitative";
  /**
   * Whether the item must be answered for submission. Absent means required:
   * legacy snapshots never set the flag and have always enforced every item.
   */
  required?: boolean;
};

type StructureSnapshotQuestion = {
  key: string;
  type?: "likert" | "guided_open_ended";
  required?: boolean;
};

type StructureSnapshotSection = {
  items?: StructureSnapshotItem[];
  questions?: StructureSnapshotQuestion[];
  key: string;
  qualitative_prompts?: unknown;
  quantitative_items?: unknown;
};

type SubmissionAnswers = Record<string, unknown>;

export type SubmitStudentCourseBoundResponseInput = {
  assignmentId: string;
  answers: SubmissionAnswers;
};

export type SubmitStudentCourseBoundResponseResult =
  | {
      error: string;
      success: false;
    }
  | {
      responseId: string;
      status: "SUBMITTED";
      success: true;
    };

type AssertSubmissionIsAllowedInput = {
  answers: SubmissionAnswers;
  structureSnapshot: unknown;
};

type BuildSubmittedResponsePatchInput = {
  submittedAt: string;
};

type SubmittedResponsePatch = {
  status: "SUBMITTED";
  submittedAt: string;
};

function isSnapshotItem(value: unknown): value is StructureSnapshotItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return typeof (value as StructureSnapshotItem).key === "string";
}

function isSnapshotSection(value: unknown): value is StructureSnapshotSection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return typeof (value as StructureSnapshotSection).key === "string";
}

function buildAnswerKey(sectionKey: string, kind: "quantitative" | "qualitative", itemKey: string) {
  return `${sectionKey}:${kind}:${itemKey}`;
}

function hasAnswerValue(kind: "quantitative" | "qualitative", value: unknown) {
  if (kind === "quantitative") {
    return typeof value === "number" && Number.isFinite(value);
  }

  return typeof value === "string" && value.trim().length > 0;
}

function getSnapshotItems(items: unknown): StructureSnapshotItem[] {
  return Array.isArray(items) ? items.filter(isSnapshotItem) : [];
}

type RequiredAnswer = { kind: "quantitative" | "qualitative"; key: string };

function collectRequiredAnswers(section: StructureSnapshotSection): RequiredAnswer[] {
  // Phase 3 format: questions[] with an explicit type and required flag.
  if (Array.isArray(section.questions)) {
    return section.questions.flatMap((question) => {
      const kind =
        question.type === "likert"
          ? "quantitative"
          : question.type === "guided_open_ended"
            ? "qualitative"
            : null;

      if (!kind || question.required === false) {
        return [];
      }

      return [{ kind, key: question.key }];
    });
  }

  // Intermediate format: unified items[] with a kind discriminator.
  if (Array.isArray(section.items)) {
    return section.items.flatMap((item) => {
      const kind =
        item.kind === "quantitative"
          ? "quantitative"
          : item.kind === "qualitative"
            ? "qualitative"
            : null;

      // Optional items may stay blank; absent flag keeps the legacy
      // behaviour of requiring every answer.
      if (!kind || item.required === false) {
        return [];
      }

      return [{ kind, key: item.key }];
    });
  }

  // Legacy format: separate quantitative_items and qualitative_prompts arrays.
  const quantitative = getSnapshotItems(section.quantitative_items).map((item) => ({
    key: item.key,
    kind: "quantitative" as const,
  }));
  const qualitative = getSnapshotItems(section.qualitative_prompts).map((item) => ({
    key: item.key,
    kind: "qualitative" as const,
  }));

  return [...quantitative, ...qualitative];
}

export function assertSubmissionIsAllowed({
  answers,
  structureSnapshot,
}: AssertSubmissionIsAllowedInput): void {
  const missingAnswerKeys = Array.isArray(structureSnapshot)
    ? structureSnapshot.filter(isSnapshotSection).flatMap((section) =>
        collectRequiredAnswers(section)
          .filter(
            ({ kind, key }) =>
              !hasAnswerValue(kind, answers[buildAnswerKey(section.key, kind, key)])
          )
          .map(({ kind, key }) => buildAnswerKey(section.key, kind, key))
      )
    : [];

  if (missingAnswerKeys.length > 0) {
    throw new Error(`Missing required answers: ${missingAnswerKeys.join(", ")}`);
  }
}

export function buildSubmittedResponsePatch({
  submittedAt,
}: BuildSubmittedResponsePatchInput): SubmittedResponsePatch {
  return {
    status: ResponseStatus.SUBMITTED,
    submittedAt,
  };
}

export async function submitStudentCourseBoundResponse({
  answers,
  assignmentId,
}: SubmitStudentCourseBoundResponseInput): Promise<SubmitStudentCourseBoundResponseResult> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return {
      error: "Authentication is required.",
      success: false,
    };
  }

  const assignment = await prisma.evaluationAssignment.findFirst({
    where: {
      course_bound_id: { not: null },
      id: assignmentId,
      respondent_id: authSession.userId,
    },
    include: {
      course_bound: {
        include: {
          course_assignment: {
            include: { course: true },
          },
          cilo_question_bindings: true,
          instrument: true,
        },
      },
    },
  });

  if (!assignment?.course_bound) {
    return {
      error: "Evaluation assignment not found.",
      success: false,
    };
  }

  if (!isCourseBoundEvaluationAvailable(assignment.course_bound)) {
    return {
      error: STUDENT_EVALUATION_UNAVAILABLE_ERROR,
      success: false,
    };
  }

  const eligibility = await resolveCourseBoundEvaluationEligibility(
    toCourseBoundEvaluationEligibilityAssignment(assignment.course_bound.course_assignment),
    authSession.userId
  );
  if (!eligibility.eligible) {
    return {
      error: STUDENT_EVALUATION_UNAVAILABLE_ERROR,
      success: false,
    };
  }

  assertSubmissionIsAllowed({
    answers,
    structureSnapshot: assignment.course_bound.instrument.structure_snapshot,
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockResponseSubmission(tx, assignment.id);
      let response = await tx.response.findUnique({
        where: {
          assignment_id: assignment.id,
        },
      });

      if (response?.status === ResponseStatus.SUBMITTED) {
        throw new Error("ALREADY_SUBMITTED");
      }

      if (!response) {
        response = await tx.response.create({
          data: {
            assignment_id: assignment.id,
            deployment_id: assignment.course_bound_id!,
            deployment_type: DeploymentType.COURSE_BOUND,
            respondent_id: authSession.userId,
            status: ResponseStatus.IN_PROGRESS,
          },
        });
      }

      const quantitativeItems = Object.entries(answers)
        .map(([answerKey, value]) => {
          const parsed = parseStudentEvaluationAnswerKey(answerKey);

          if (!parsed || parsed.kind !== "quantitative" || typeof value !== "number") {
            return null;
          }

          const ciloBinding = (assignment.course_bound?.cilo_question_bindings ?? []).find(
            (binding) =>
              binding.section_key === parsed.sectionKey && binding.item_key === parsed.itemKey
          );

          return {
            cilo_question_binding_id: ciloBinding?.id ?? null,
            item_key: parsed.itemKey,
            rating_value: value,
            response_id: response.id,
            section_key: parsed.sectionKey,
          };
        })
        .filter(
          (
            item
          ): item is {
            cilo_question_binding_id: string | null;
            item_key: string;
            rating_value: number;
            response_id: string;
            section_key: string;
          } => item !== null
        );

      const qualitativeItems = Object.entries(answers)
        .map(([answerKey, value]) => {
          const parsed = parseStudentEvaluationAnswerKey(answerKey);

          if (!parsed || parsed.kind !== "qualitative" || typeof value !== "string") {
            return null;
          }

          return {
            prompt_key: parsed.itemKey,
            response_id: response.id,
            section_key: parsed.sectionKey,
            text_content: value,
          };
        })
        .filter(
          (
            item
          ): item is {
            prompt_key: string;
            response_id: string;
            section_key: string;
            text_content: string;
          } => item !== null
        );

      await tx.quantitativeResponseItem.deleteMany({ where: { response_id: response.id } });
      await tx.qualitativeResponseItem.deleteMany({ where: { response_id: response.id } });

      if (quantitativeItems.length > 0) {
        await tx.quantitativeResponseItem.createMany({ data: quantitativeItems });
      }

      if (qualitativeItems.length > 0) {
        await tx.qualitativeResponseItem.createMany({ data: qualitativeItems });
      }

      const submittedAt = new Date().toISOString();

      await tx.response.update({
        data: {
          status: ResponseStatus.SUBMITTED,
          submitted_at: new Date(submittedAt),
        },
        where: {
          id: response.id,
        },
      });

      return {
        responseId: response.id,
      };
    });

    return {
      responseId: result.responseId,
      status: ResponseStatus.SUBMITTED,
      success: true,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_SUBMITTED") {
      return {
        error: "This evaluation has already been submitted.",
        success: false,
      };
    }
    console.error("Failed to submit course-bound response:", error);
    return {
      error: "An unexpected error occurred while submitting your response.",
      success: false,
    };
  }
}
