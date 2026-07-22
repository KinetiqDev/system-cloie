import { DeploymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import type { CloseFacultyEvaluationResult } from "../types";

export async function closeFacultyEvaluation(
  evaluationId: string
): Promise<CloseFacultyEvaluationResult> {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.FACULTY) {
    return { success: false, error: "Unauthorized. Faculty role required." };
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
      status: true,
    },
  });

  if (!evaluation) {
    return {
      success: false,
      error: "Evaluation not found or you do not have access.",
    };
  }

  // Can only close ACTIVE or SCHEDULED evaluations
  if (
    evaluation.status !== DeploymentStatus.ACTIVE &&
    evaluation.status !== DeploymentStatus.SCHEDULED
  ) {
    return {
      success: false,
      error: `Cannot close evaluation with status: ${evaluation.status}. Only ACTIVE or SCHEDULED evaluations can be closed.`,
    };
  }

  await prisma.courseBoundEvaluation.update({
    where: {
      id: evaluationId,
    },
    data: {
      status: DeploymentStatus.CLOSED,
      updated_at: new Date(),
    },
  });

  return { success: true, data: undefined };
}
