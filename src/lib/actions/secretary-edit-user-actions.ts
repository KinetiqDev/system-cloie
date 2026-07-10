"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { editUserBySecretarySchema } from "@/features/users/schemas/edit-user";
import { editUserBySecretary } from "@/features/users/services/edit-user-by-secretary";
import {
  getUserEditRecordBySecretary,
  type SecretaryUserEditRecord,
} from "@/features/users/services/get-user-edit-record";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

type AccessGrant = { id: string };

type AccessResult = { success: true; data: AccessGrant } | { success: false; error: string };

async function requireSecretaryAccess(): Promise<AccessResult> {
  const session = await resolveAuthSession();
  if (!session?.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  if (session.activeRole !== ROLES.SECRETARY) {
    return { success: false, error: "Secretary access required." };
  }
  return { success: true, data: { id: session.userId } };
}

export async function getUserEditRecordAction(
  userId: string
): Promise<ActionResult<SecretaryUserEditRecord>> {
  const access = await requireSecretaryAccess();
  if (!access.success) {
    return access;
  }
  if (userId === access.data.id) {
    return { success: false, error: "Cannot edit your own account." };
  }
  const result = await getUserEditRecordBySecretary(userId);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}

/**
 * Server Action wrapper for the Secretary role-based user edit flow.
 * #80 supports base identity updates only. Role-specific record updates
 * and the protected-change confirmation protocol land in #81–#85.
 */
export async function editUserBySecretaryAction(formData: FormData): Promise<
  ActionResult<{
    id: string;
    protectedConfirmationRequired?: boolean;
    protectedPayload?: string;
    token?: string;
  }>
> {
  const access = await requireSecretaryAccess();
  if (!access.success) {
    return access;
  }

  const raw: Record<string, unknown> = {
    id: String(formData.get("id") ?? ""),
    role: formData.get("role") || undefined,
    first_name: String(formData.get("first_name") ?? ""),
    last_name: String(formData.get("last_name") ?? ""),
    confirmationToken: formData.get("confirmationToken") || undefined,
  };

  if (formData.get("student.program_id")) {
    raw.student = {
      student_id_number: formData.get("student.student_id_number"),
      program_id: formData.get("student.program_id"),
      major_id: formData.get("student.major_id") || undefined,
      year_level: formData.get("student.year_level") || undefined,
      section: formData.get("student.section") || undefined,
    };
  }

  if (formData.get("faculty.program_id")) {
    raw.faculty = {
      program_id: formData.get("faculty.program_id"),
    };
  }

  if (formData.get("program_head.program_id")) {
    raw.program_head = {
      program_id: formData.get("program_head.program_id"),
    };
  }

  if (formData.get("alumni.program_id")) {
    raw.alumni = {
      graduation_year: formData.get("alumni.graduation_year"),
      program_id: formData.get("alumni.program_id"),
      major_id: formData.get("alumni.major_id") || null,
      verification_status: formData.get("alumni.verification_status"),
    };
  }

  const parsed = editUserBySecretarySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  if (parsed.data.id === access.data.id) {
    return { success: false, error: "Cannot edit your own account." };
  }

  const result = await editUserBySecretary(parsed.data);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  if (!result.data.protectedConfirmationRequired) {
    revalidatePath("/secretary/users");
  }
  return { success: true, data: result.data };
}
