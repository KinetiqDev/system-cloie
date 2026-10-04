import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import type {
  StudentEvaluationSection,
  StudentEvaluationSession,
} from "@/features/responses/types";
import { isDeploymentAvailable } from "./deployment-availability";
import { prepareEvaluationSession } from "./evaluation-session";

// ─── Internal helpers ───────────────────────────────────────────────────────

function evaluationIsReadable(
  response: { submitted_at: Date | null } | null,
  deployment: {
    activation_at: Date | null;
    deadline_at: Date | null;
    status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  }
): boolean {
  // Keep submitted evaluations readable after the deployment window closes.
  // Only the wizard needs the availability gate; review pages must not 404
  // on an answered evaluation.
  return Boolean(response?.submitted_at) || isDeploymentAvailable(deployment);
}

// ─── Public types ───────────────────────────────────────────────────────────

export type CentralDeploymentEvaluationSession = {
  assignmentId: string;
  evaluationTitle: string;
  sections: StudentEvaluationSection[];
  savedAnswers: Record<string, number | string>;
  session: StudentEvaluationSession;
};

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Load an assigned central deployment evaluation for the current respondent.
 *
 * 1. Authenticates via `resolveAuthSession()`
 * 2. Finds `EvaluationAssignment` where `central_deployment_id = deploymentId`
 *    AND `respondent_id = session.userId`
 * 3. Verifies deployment availability
 * 4. Maps `structure_snapshot` to wizard sections
 * 5. Loads existing response + items (if any)
 * 6. Returns the session DTO or `null` if unauthorized / unavailable
 */
export async function getCentralDeploymentEvaluationSession(
  deploymentId: string
): Promise<CentralDeploymentEvaluationSession | null> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return null;
  }

  // Find assignment linking this respondent to the deployment
  const assignment = await prisma.evaluationAssignment.findFirst({
    where: {
      central_deployment_id: deploymentId,
      respondent_id: authSession.userId,
    },
    include: {
      central_deployment: {
        include: {
          instrument: {
            include: {
              template: true,
            },
          },
        },
      },
      response: {
        include: {
          qual_items: true,
          quant_items: true,
        },
      },
    },
  });

  if (!assignment?.central_deployment) {
    return null;
  }

  const deployment = assignment.central_deployment;

  // Keep submitted evaluations readable after the deployment window closes.
  // Only the wizard needs the availability gate; review pages must not 404
  // on an answered evaluation.
  const response = assignment.response ?? null;
  if (!evaluationIsReadable(response, deployment)) {
    return null;
  }

  return {
    assignmentId: assignment.id,
    evaluationTitle: deployment.deployment_name ?? deployment.instrument.template.name,
    ...prepareEvaluationSession(deployment.instrument.structure_snapshot, response),
  };
}
