import { FacultyApprovalStatus } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

export type FacultyAccessRequestListItem = {
  userId: string;
  name: string;
  email: string;
  programId: string;
  programCode: string;
  programName: string;
  status: FacultyApprovalStatus;
  submittedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  isActive: boolean;
};

export type FacultyAccessRequestListResult =
  | { success: true; data: { requests: FacultyAccessRequestListItem[]; pendingCount: number } }
  | { success: false; error: string };

/**
 * Secretary read model for self-submitted Faculty requests (issue #649).
 *
 * Faculty registration is self-submitted but not self-authorized, so the
 * institution must be able to review it: this lists requests with the
 * requested program and decision history, newest first. Authorization resolves
 * the *active* role, so holding a second role never grants review authority
 * implicitly (ADR 0022).
 */
export async function listFacultyAccessRequests(): Promise<FacultyAccessRequestListResult> {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.SECRETARY) {
    return { success: false, error: "Secretary access required." };
  }
  if (session.profileGate.status !== "COMPLETE") {
    return { success: false, error: "Your Secretary account is not ready." };
  }

  const rows = await prisma.facultyAccessRequest.findMany({
    orderBy: [{ status: "asc" }, { created_at: "desc" }],
    include: {
      program: { select: { id: true, code: true, name: true } },
      user: { select: { id: true, name: true, email: true, is_active: true } },
    },
  });

  return {
    success: true,
    data: {
      pendingCount: rows.filter((row) => row.status === FacultyApprovalStatus.PENDING).length,
      requests: rows.map((row) => ({
        userId: row.user.id,
        name: row.user.name,
        email: row.user.email,
        programId: row.program.id,
        programCode: row.program.code,
        programName: row.program.name,
        status: row.status,
        submittedAt: row.created_at.toISOString(),
        decidedAt: row.decided_at ? row.decided_at.toISOString() : null,
        decisionNote: row.decision_note,
        isActive: row.user.is_active,
      })),
    },
  };
}
