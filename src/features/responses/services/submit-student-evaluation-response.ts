import { DeploymentType, ResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  resolveCourseBoundEvaluationEligibility,
  toCourseBoundEvaluationEligibilityAssignment,
} from "@/features/course-assignments/services/course-assignment-roster";
import {
  isCentralDeploymentAvailable,
  isCourseBoundEvaluationAvailable,
  STUDENT_EVALUATION_UNAVAILABLE_ERROR,
} from "./course-bound-availability";
import { assertSubmissionIsAllowed } from "./assert-submission-is-allowed";
import {
  ALREADY_SUBMITTED_ERROR,
  finalizeResponseSubmission,
} from "./finalize-response-submission";

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
      submittedAt: string;
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
          cilo_question_bindings: true,
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
    const result = await prisma.$transaction((tx) =>
      finalizeResponseSubmission({
        answers,
        assignmentId: assignment.id,
        ciloQuestionBindings: assignment.course_bound?.cilo_question_bindings,
        createData: {
          assignment_id: assignment.id,
          deployment_id: assignment.course_bound_id ?? assignment.central_deployment_id ?? "",
          deployment_type: assignment.course_bound
            ? DeploymentType.COURSE_BOUND
            : DeploymentType.CENTRAL,
          respondent_id: authSession.userId,
          status: ResponseStatus.IN_PROGRESS,
        },
        tx,
      })
    );

    return {
      responseId: result.responseId,
      status: ResponseStatus.SUBMITTED,
      submittedAt: result.submittedAt,
      success: true,
    };
  } catch (error) {
    if (error instanceof Error && error.message === ALREADY_SUBMITTED_ERROR) {
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
