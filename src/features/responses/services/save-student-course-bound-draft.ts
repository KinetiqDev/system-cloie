import { DeploymentType, ResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  resolveCourseBoundEvaluationEligibility,
  toCourseBoundEvaluationEligibilityAssignment,
} from "@/features/course-assignments/services/course-assignment-roster";
import {
  parseStudentEvaluationAnswerKey,
  type StudentEvaluationAnswerKind,
} from "@/features/responses/answer-keys";
import type { StudentEvaluationSection } from "@/features/responses/types";
import {
  isCourseBoundEvaluationAvailable,
  STUDENT_EVALUATION_UNAVAILABLE_ERROR,
} from "./course-bound-availability";
import { mapStructureSnapshotToSections } from "./get-student-course-bound-evaluation-session";

export type SaveStudentCourseBoundDraftInput = {
  assignmentId: string;
  sectionKey: string;
  answers: Record<string, unknown>;
};

export type SaveStudentCourseBoundDraftResult =
  | {
      error: string;
      success: false;
    }
  | {
      responseId: string;
      success: true;
      savedAt: string;
    };

type QuantitativeDraftUpsert = {
  item_key: string;
  rating_value: number;
  response_id: string;
  section_key: string;
  updated_at: string;
};

type QualitativeDraftUpsert = {
  prompt_key: string;
  response_id: string;
  section_key: string;
  text_content: string;
  updated_at: string;
};

type BuildDraftUpsertsInput = {
  answers: Record<string, unknown>;
  responseId: string;
  section: StudentEvaluationSection;
  updatedAt: string;
};

type SectionAnswerEntry = {
  itemKey: string;
  kind: StudentEvaluationAnswerKind;
  value: unknown;
};

function getSectionAnswerEntries({
  answers,
  section,
}: Pick<BuildDraftUpsertsInput, "answers" | "section">): SectionAnswerEntry[] {
  return Object.entries(answers)
    .map(([answerKey, value]) => {
      const parsedAnswerKey = parseStudentEvaluationAnswerKey(answerKey);

      if (!parsedAnswerKey || parsedAnswerKey.sectionKey !== section.id) {
        return null;
      }

      return {
        itemKey: parsedAnswerKey.itemKey,
        kind: parsedAnswerKey.kind,
        value,
      };
    })
    .filter((entry): entry is SectionAnswerEntry => entry !== null);
}

export function buildQuantitativeUpserts({
  answers,
  responseId,
  section,
  updatedAt,
}: BuildDraftUpsertsInput): QuantitativeDraftUpsert[] {
  return getSectionAnswerEntries({ answers, section })
    .filter(
      (entry): entry is SectionAnswerEntry & { kind: "quantitative"; value: number } =>
        entry.kind === "quantitative" &&
        typeof entry.value === "number" &&
        Number.isFinite(entry.value)
    )
    .map(({ itemKey, value }) => ({
      item_key: itemKey,
      rating_value: value,
      response_id: responseId,
      section_key: section.id,
      updated_at: updatedAt,
    }));
}

export function buildQualitativeUpserts({
  answers,
  responseId,
  section,
  updatedAt,
}: BuildDraftUpsertsInput): QualitativeDraftUpsert[] {
  return getSectionAnswerEntries({ answers, section })
    .filter(
      (entry): entry is SectionAnswerEntry & { kind: "qualitative"; value: string } =>
        entry.kind === "qualitative" && typeof entry.value === "string"
    )
    .map(({ itemKey, value }) => ({
      prompt_key: itemKey,
      response_id: responseId,
      section_key: section.id,
      text_content: value,
      updated_at: updatedAt,
    }));
}

export async function saveStudentCourseBoundDraft({
  assignmentId,
  answers,
  sectionKey,
}: SaveStudentCourseBoundDraftInput): Promise<SaveStudentCourseBoundDraftResult> {
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

  const section = mapStructureSnapshotToSections(
    assignment.course_bound.instrument.structure_snapshot
  ).find((entry) => entry.id === sectionKey);

  if (!section) {
    return {
      error: `Unknown section ${sectionKey}.`,
      success: false,
    };
  }

  let response = await prisma.response.findUnique({
    where: {
      assignment_id: assignment.id,
    },
  });

  if (response?.status === ResponseStatus.SUBMITTED) {
    return {
      error: "This evaluation has already been submitted.",
      success: false,
    };
  }

  if (!response) {
    response = await prisma.response.create({
      data: {
        assignment_id: assignment.id,
        deployment_id: assignment.course_bound_id!,
        deployment_type: DeploymentType.COURSE_BOUND,
        respondent_id: authSession.userId,
        status: ResponseStatus.IN_PROGRESS,
      },
    });
  }

  const updatedAt = new Date().toISOString();
  const quantitativeUpserts = buildQuantitativeUpserts({
    answers,
    responseId: response.id,
    section,
    updatedAt,
  });
  const qualitativeUpserts = buildQualitativeUpserts({
    answers,
    responseId: response.id,
    section,
    updatedAt,
  });

  await prisma.quantitativeResponseItem.deleteMany({
    where: {
      response_id: response.id,
      section_key: section.id,
    },
  });
  await prisma.qualitativeResponseItem.deleteMany({
    where: {
      response_id: response.id,
      section_key: section.id,
    },
  });

  if (quantitativeUpserts.length > 0) {
    await prisma.quantitativeResponseItem.createMany({ data: quantitativeUpserts });
  }

  if (qualitativeUpserts.length > 0) {
    await prisma.qualitativeResponseItem.createMany({ data: qualitativeUpserts });
  }

  return {
    responseId: response.id,
    savedAt: updatedAt,
    success: true,
  };
}
