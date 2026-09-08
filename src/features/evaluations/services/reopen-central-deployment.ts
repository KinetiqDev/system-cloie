import { DeploymentStatus } from "@prisma/client";

import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  revalidateProgramHeadAssignment,
  resolveProgramHeadContext,
} from "@/features/auth/services/resolve-program-head-context";
import { type ServiceResult } from "@/lib/utils/service-result";

export type ReopenCentralDeploymentResult = ServiceResult<{
  activationAt: Date;
  deadlineAt: Date;
}>;

export async function reopenCentralDeployment(
  programId: string,
  deploymentId: string,
  deadlineAt: Date
): Promise<ReopenCentralDeploymentResult> {
  const authSession = await resolveAuthSession();

  if (authSession?.activeRole !== ROLES.PROGRAM_HEAD) {
    return {
      success: false,
      error: "Program Head authentication is required.",
    };
  }

  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) return contextResult;

  const now = new Date();
  if (Number.isNaN(deadlineAt.getTime()) || deadlineAt.getTime() <= now.getTime()) {
    return { success: false, error: "Choose a deadline later than the current time." };
  }

  const deployment = await prisma.centralDeployment.findUnique({
    where: { id: deploymentId },
    select: {
      id: true,
      program_id: true,
      deadline_at: true,
      status: true,
      updated_at: true,
    },
  });

  if (!deployment) {
    return { success: false, error: "Deployment not found." };
  }

  if (deployment.program_id !== contextResult.data.selectedProgram.id) {
    return {
      success: false,
      error: "You do not have permission to reopen this deployment.",
    };
  }

  const effectivelyClosed =
    deployment.status === DeploymentStatus.CLOSED ||
    ((deployment.status === DeploymentStatus.ACTIVE ||
      deployment.status === DeploymentStatus.SCHEDULED) &&
      deployment.deadline_at !== null &&
      deployment.deadline_at.getTime() < now.getTime());

  if (!effectivelyClosed) {
    return {
      success: false,
      error: `Cannot reopen deployment with status: ${deployment.status}. Only closed deployments can be reopened.`,
    };
  }
  // Optimistic concurrency: the write only applies when the row still carries
  // the state observed above, so a stale reopen cannot overwrite a close (or
  // any other mutation) that landed after this operation's read.
  const reopened = await prisma.$transaction(async (tx) => {
    const currentProgram = await revalidateProgramHeadAssignment(tx, {
      userId: contextResult.data.userId,
      programId: contextResult.data.selectedProgram.id,
    });
    if (!currentProgram) return null;
    const write = await tx.centralDeployment.updateMany({
      where: {
        id: deploymentId,
        program_id: contextResult.data.selectedProgram.id,
        updated_at: deployment.updated_at,
        OR: [
          { status: DeploymentStatus.CLOSED },
          {
            status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.SCHEDULED] },
            deadline_at:
              deployment.deadline_at === null ? null : { equals: deployment.deadline_at },
          },
        ],
      },
      data: {
        activation_at: now,
        deadline_at: deadlineAt,
        status: DeploymentStatus.ACTIVE,
        updated_at: now,
      },
    });
    return write.count === 1 ? { activationAt: now, deadlineAt } : null;
  });

  if (!reopened) {
    return {
      success: false,
      error: "This deployment is no longer closed. Refresh the page and try again.",
    };
  }

  return { success: true, data: reopened };
}
