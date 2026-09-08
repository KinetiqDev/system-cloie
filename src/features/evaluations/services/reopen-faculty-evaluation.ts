import { DeploymentStatus } from "@prisma/client";

import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";
import type { ReopenFacultyEvaluationResult } from "../types";

export async function reopenFacultyEvaluation(
  evaluationId: string,
  deadlineAt: Date
): Promise<ReopenFacultyEvaluationResult> {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.FACULTY) {
    return { success: false, error: "Unauthorized. Faculty role required." };
  }

  const now = new Date();
  if (Number.isNaN(deadlineAt.getTime()) || deadlineAt.getTime() <= now.getTime()) {
    return { success: false, error: "Choose a deadline later than the current time." };
  }

  const evaluation = await prisma.courseBoundEvaluation.findFirst({
    where: {
      id: evaluationId,
      course_assignment: {
        faculty_id: session.userId,
      },
    },
    select: {
      id: true,
      deadline_at: true,
      status: true,
    },
  });

  if (!evaluation) {
    return {
      success: false,
      error: "Evaluation not found or you do not have access.",
    };
  }

  const effectivelyClosed =
    evaluation.status === DeploymentStatus.CLOSED ||
    ((evaluation.status === DeploymentStatus.ACTIVE ||
      evaluation.status === DeploymentStatus.SCHEDULED) &&
      evaluation.deadline_at !== null &&
      evaluation.deadline_at.getTime() < now.getTime());

  if (!effectivelyClosed) {
    return {
      success: false,
      error: `Cannot reopen evaluation with status: ${evaluation.status}. Only closed evaluations can be reopened.`,
    };
  }

  const reopened = await prisma.courseBoundEvaluation.updateMany({
    where: {
      course_assignment: {
        faculty_id: session.userId,
      },
      id: evaluationId,
      OR: [
        { status: DeploymentStatus.CLOSED },
        {
          status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.SCHEDULED] },
          deadline_at: { lt: now },
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

  if (reopened.count !== 1) {
    return {
      success: false,
      error: "This evaluation is no longer closed. Refresh the page and try again.",
    };
  }

  return { success: true, data: { activationAt: now, deadlineAt } };
}
