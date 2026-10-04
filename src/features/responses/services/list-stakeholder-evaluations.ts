import { TargetStakeholder } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import type { StudentEvaluationListItem } from "@/features/responses/types";
import { buildCentralProgramLabel } from "./central-program-label";
import { isDeploymentAvailable } from "./deployment-availability";
import { buildEvaluationSession, buildFallbackSection } from "./evaluation-session";
import { mapTemplateStructureToSections } from "./map-template-structure";

// ─── Internal helpers ───────────────────────────────────────────────────────

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Lists evaluations assigned to the current user for a given stakeholder type.
 *
 * Returns `StudentEvaluationListItem[]` split into active and submitted buckets
 * so both alumni and industry partner portals can reuse `EvaluationListCard`.
 */
export async function listStakeholderEvaluations(
  stakeholderType: TargetStakeholder,
  basePath: string = "/alumni"
): Promise<{
  active: StudentEvaluationListItem[];
  submitted: StudentEvaluationListItem[];
}> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return { active: [], submitted: [] };
  }

  const now = new Date();

  const assignments = await prisma.evaluationAssignment.findMany({
    where: {
      respondent_id: authSession.userId,
      central_deployment_id: { not: null },
      central_deployment: {
        target_stakeholder: stakeholderType,
        status: { in: ["ACTIVE", "CLOSED", "SCHEDULED"] },
      },
    },
    include: {
      central_deployment: {
        include: {
          instrument: {
            include: {
              template: true,
            },
          },
          major: true,
          program: true,
        },
      },
      response: {
        include: {
          qual_items: true,
          quant_items: true,
        },
      },
    },
    orderBy: {
      assigned_at: "desc",
    },
  });

  const items: StudentEvaluationListItem[] = assignments
    .filter((a) => a.central_deployment !== null)
    .flatMap((assignment) => {
      const deployment = assignment.central_deployment!;
      const response = assignment.response ?? null;

      // Skip unavailable deployments unless already submitted
      if (!response?.submitted_at && !isDeploymentAvailable(deployment, now)) {
        return [];
      }

      const sections = mapTemplateStructureToSections(deployment.instrument.structure_snapshot);
      const section = sections[0] ?? buildFallbackSection();
      const session = buildEvaluationSession(sections, response);
      const { answeredItems, totalItems } = session;

      const isSubmitted = !!response?.submitted_at;
      const isInProgress = !isSubmitted && !!response;

      const progress =
        totalItems > 0
          ? Math.min(100, Math.max(0, Math.round((answeredItems / totalItems) * 100)))
          : 0;

      const status = isSubmitted
        ? ("SUBMITTED" as const)
        : isInProgress
          ? ("IN_PROGRESS" as const)
          : ("NOT_STARTED" as const);

      const href = isSubmitted
        ? `${basePath}/evaluations/${deployment.id}/submitted`
        : `${basePath}/evaluations/${deployment.id}`;

      return [
        {
          assignmentId: assignment.id,
          courseTitle: null,
          deadlineAt: deployment.deadline_at,
          deploymentType: "CENTRAL" as const,
          evaluationId: deployment.id,
          evaluationTitle: deployment.deployment_name ?? deployment.instrument.template.name,
          facultyName: null,
          href,
          progress,
          programLabel: buildCentralProgramLabel(deployment),
          section,
          session,
          status,
        },
      ];
    });

  // Sort: active items by deadline ascending (soonest first)
  const active = items
    .filter((item) => item.status !== "SUBMITTED")
    .sort((a, b) => {
      if (!a.deadlineAt && !b.deadlineAt) return 0;
      if (!a.deadlineAt) return 1;
      if (!b.deadlineAt) return -1;
      return a.deadlineAt.getTime() - b.deadlineAt.getTime();
    });

  // Sort: submitted items by submittedAt descending (most recent first)
  const submitted = items
    .filter((item) => item.status === "SUBMITTED")
    .sort((a, b) => {
      const aTime = a.session.submittedAt?.getTime() ?? 0;
      const bTime = b.session.submittedAt?.getTime() ?? 0;
      return bTime - aTime;
    });

  return { active, submitted };
}
