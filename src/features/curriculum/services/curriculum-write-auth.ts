"use server";

import { type Prisma as PrismaTypes } from "@prisma/client";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { type ServiceResult } from "@/lib/utils/service-result";

type Tx = PrismaTypes.TransactionClient;

export type CurriculumWriteActor = {
  userId: string;
  role: "SECRETARY" | "PROGRAM_HEAD";
};

/**
 * Resolve the writing actor. Curriculum write authority belongs to SECRETARY
 * (cross-program) or PROGRAM_HEAD (scoped to active assignments).
 */
export async function resolveWriteActor(): Promise<ServiceResult<CurriculumWriteActor>> {
  const session = await resolveAuthSession();

  if (!session) {
    return { success: false, error: "Authentication is required" };
  }
  if (session.activeRole === ROLES.SECRETARY) {
    return { success: true, data: { userId: session.userId, role: "SECRETARY" } };
  }
  if (session.activeRole === ROLES.PROGRAM_HEAD) {
    return { success: true, data: { userId: session.userId, role: "PROGRAM_HEAD" } };
  }
  return { success: false, error: "Secretary or Program Head access required" };
}

/**
 * Verify a PROGRAM_HEAD may operate on the given program. SECRETARY bypasses
 * the scope check. Server Actions run with the service role (RLS bypassed),
 * so this re-validates the active assignment set inside the transaction per
 * ADR 0009.
 */
export async function assertProgramAccess(
  actor: CurriculumWriteActor,
  tx: Tx,
  programId: string
): Promise<ServiceResult<null>> {
  if (actor.role === "SECRETARY") {
    return { success: true, data: null };
  }

  const assignment = await tx.programHeadAssignment.findFirst({
    where: { program_head_id: actor.userId, program_id: programId, is_active: true },
    select: { id: true },
  });

  if (!assignment) {
    return { success: false, error: "Program Head access is limited to assigned programs" };
  }

  return { success: true, data: null };
}
