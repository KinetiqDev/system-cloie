"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  approveFacultyAccessRequest,
  rejectFacultyAccessRequest,
} from "@/features/users/services/manage-faculty-access-requests";
import { requireLegalAcknowledgement } from "@/features/legal/services/require-legal-acknowledgement";

type FacultyApprovalActionResult = { success: true } | { success: false; error: string };

const facultyDecisionSchema = z.object({
  userId: z.string().uuid("Select a valid Faculty request."),
  note: z.string().trim().max(500).optional(),
});

/**
 * Faculty request review is a Secretary capability. Authorization resolves the
 * *active* role, not membership anywhere in the assigned-role set, so holding
 * a second role never grants review authority implicitly.
 */
async function authorizeFacultyReview(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const legal = await requireLegalAcknowledgement("secretary");
  if (!legal.acknowledged) {
    return { ok: false, error: "A current legal acknowledgement is required." };
  }

  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.SECRETARY) {
    return { ok: false, error: "Secretary access required." };
  }
  if (session.profileGate.status !== "COMPLETE") {
    return { ok: false, error: "Your Secretary account is not ready." };
  }

  return { ok: true, userId: session.userId };
}

export async function approveFacultyRequestAction(
  input: unknown
): Promise<FacultyApprovalActionResult> {
  const access = await authorizeFacultyReview();
  if (!access.ok) return { success: false, error: access.error };

  const parsed = facultyDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const result = await approveFacultyAccessRequest({
    requestUserId: parsed.data.userId,
    decidedByUserId: access.userId,
    note: parsed.data.note ?? null,
  });
  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/secretary/users");
  return { success: true };
}

export async function rejectFacultyRequestAction(
  input: unknown
): Promise<FacultyApprovalActionResult> {
  const access = await authorizeFacultyReview();
  if (!access.ok) return { success: false, error: access.error };

  const parsed = facultyDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const result = await rejectFacultyAccessRequest({
    requestUserId: parsed.data.userId,
    decidedByUserId: access.userId,
    note: parsed.data.note ?? null,
  });
  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/secretary/users");
  return { success: true };
}
