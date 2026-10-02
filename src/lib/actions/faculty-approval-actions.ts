"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  approveFacultyAccessRequest,
  rejectFacultyAccessRequest,
} from "@/features/users/services/manage-faculty-access-requests";

type FacultyApprovalActionResult = { success: true } | { success: false; error: string };

const facultyDecisionSchema = z.object({
  userId: z.string().uuid("Select a valid Faculty request."),
  note: z.string().trim().max(500).optional(),
});

/**
 * Faculty request review is a Secretary capability. Authorization resolves the
 * *active* role, not membership anywhere in the assigned-role set, so holding
 * a second role never grants review authority implicitly.
 *
 * The legal acknowledgement gate is deliberately absent here. The signed
 * ticket proves acceptance per sign-in flow only and is cleared by the OAuth
 * callback, so it is an *entry* gate: a Secretary who signed in through the
 * staff entrance already acknowledged the current documents, and an ordinary
 * administrative decision neither re-enters nor grants a role. Requiring an
 * entry ticket again would make every real decision unreachable. The gate
 * still runs before the writes that do enter or grant — the Faculty
 * registration action (`src/lib/actions/faculty-actions.ts`) and the
 * email-first external actions (`src/lib/actions/external-entry-actions.ts`).
 *
 * The Google method stays enforced: SECRETARY is a Google-only role, so a
 * password, OTP, or recovery session resolves the profile gate to
 * AUTH_METHOD_MISMATCH and fails the readiness check below.
 */
async function authorizeFacultyReview(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
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
