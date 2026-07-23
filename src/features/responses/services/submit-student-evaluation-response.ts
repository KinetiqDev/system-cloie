import { DeploymentType, ResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  resolveCourseBoundEvaluationEligibility,
  toCourseBoundEvaluationEligibilityAssignment,
} from "@/features/course-assignments/services/course-assignment-roster";
import { parseStudentEvaluationAnswerKey } from "@/features/responses/answer-keys";
import {
  isCentralDeploymentAvailable,
  isCourseBoundEvaluationAvailable,
  STUDENT_EVALUATION_UNAVAILABLE_ERROR,
} from "./course-bound-availability";
import { assertSubmissionIsAllowed } from "./submit-student-course-bound-response";

type SubmissionAnswers = Record<string, unknown>;

export type SubmitStudentEvaluationResponseInput = {
  answers: SubmissionAnswers;
  assignmentId: string;
};

export type SubmitStudentEvaluationResponseResult =
  | {
      error: string;
      success: false;
    }
  | {
      responseId: string;
      status: "SUBMITTED";
      success: true;
    };

export async function submitStudentEvaluationResponse({
  answers,
  assignmentId,
}: SubmitStudentEvaluationResponseInput): Promise<SubmitStudentEvaluationResponseResult> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return {
      error: "Authentication is required.",
      success: false,
    };
  }

  const assignment = await prisma.evaluationAssignment.findFirst({
    where: {
      id: assignmentId,
      respondent_id: authSession.userId,
      OR: [
        { course_bound_id: { not: null } },
        {
          central_deployment: {
            is: {
              target_stakeholder: "STUDENT",
            },
          },
        },
      ],
    },
    include: {
      central_deployment: {
        include: {
          instrument: true,
        },
      },
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

  if (!assignment) {
    return {
      error: "Evaluation assignment not found.",
      success: false,
    };
  }

  const deployment =
    assignment.course_bound ??
    (assignment.central_deployment?.target_stakeholder === "STUDENT"
      ? assignment.central_deployment
      : null);

  if (!deployment) {
    return {
      error: "Evaluation assignment not found.",
      success: false,
    };
  }

  const isAvailable = assignment.course_bound
    ? isCourseBoundEvaluationAvailable(assignment.course_bound)
    : isCentralDeploymentAvailable(deployment);

  if (!isAvailable) {
    return {
      error: STUDENT_EVALUATION_UNAVAILABLE_ERROR,
      success: false,
    };
  }

  if (assignment.course_bound) {
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
  }

  assertSubmissionIsAllowed({
    answers,
    structureSnapshot: deployment.instrument.structure_snapshot,
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
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
            deployment_id: assignment.course_bound_id ?? assignment.central_deployment_id ?? "",
            deployment_type: assignment.course_bound
              ? DeploymentType.COURSE_BOUND
              : DeploymentType.CENTRAL,
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

          return {
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

      await tx.quantitativeResponseItem.deleteMany({
        where: { response_id: response.id },
      });
      await tx.qualitativeResponseItem.deleteMany({
        where: { response_id: response.id },
      });

      if (quantitativeItems.length > 0) {
        await tx.quantitativeResponseItem.createMany({ data: quantitativeItems });
      }

      if (qualitativeItems.length > 0) {
        await tx.qualitativeResponseItem.createMany({ data: qualitativeItems });
      }

      const submittedAt = new Date();

      await tx.response.update({
        data: {
          status: ResponseStatus.SUBMITTED,
          submitted_at: submittedAt,
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
    console.error("Failed to submit student evaluation response:", error);
    return {
      error: "An unexpected error occurred while submitting your response.",
      success: false,
    };
  }
}
