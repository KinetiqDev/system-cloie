import { DeploymentType, ResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { DEPLOYMENT_UNAVAILABLE_ERROR, isDeploymentAvailable } from "./deployment-availability";
import { assertSubmissionIsAllowed } from "./assert-submission-is-allowed";
import {
  ALREADY_SUBMITTED_ERROR,
  finalizeResponseSubmission,
} from "./finalize-response-submission";

// ─── Public types ───────────────────────────────────────────────────────────

export type SubmitCentralDeploymentResponseInput = {
  assignmentId: string;
  answers: Record<string, unknown>;
};

export type SubmitCentralDeploymentResponseResult =
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

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Validate and finalize a central deployment response.
 *
 * Works for any stakeholder type (ALUMNI, INDUSTRY_PARTNER, GRADUATING_STUDENT).
 * Enforces one-response rule, validates all required items are answered,
 * and atomically upserts all response items + sets status to SUBMITTED.
 */
export async function submitCentralDeploymentResponse({
  answers,
  assignmentId,
}: SubmitCentralDeploymentResponseInput): Promise<SubmitCentralDeploymentResponseResult> {
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
      central_deployment_id: { not: null },
    },
    include: {
      central_deployment: {
        include: {
          instrument: true,
        },
      },
    },
  });

  if (!assignment?.central_deployment) {
    return {
      error: "Evaluation assignment not found.",
      success: false,
    };
  }

  if (!isDeploymentAvailable(assignment.central_deployment)) {
    return {
      error: DEPLOYMENT_UNAVAILABLE_ERROR,
      success: false,
    };
  }

  assertSubmissionIsAllowed({
    answers,
    structureSnapshot: assignment.central_deployment.instrument.structure_snapshot,
  });

  try {
    const result = await prisma.$transaction((tx) =>
      finalizeResponseSubmission({
        answers,
        assignmentId: assignment.id,
        createData: {
          assignment_id: assignment.id,
          deployment_id: assignment.central_deployment_id!,
          deployment_type: DeploymentType.CENTRAL,
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
    console.error("Failed to submit central deployment response:", error);
    return {
      error: "An unexpected error occurred while submitting your response.",
      success: false,
    };
  }
}
