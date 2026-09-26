"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { createUserBySecretarySchema } from "@/features/users/schemas/create-user";
import { createUserBySecretary } from "@/features/users/services/create-user-by-secretary";

type ActionResult = { success: true } | { success: false; error: string };

/**
 * Creation result for the Secretary add-user form. `USER_EXISTS` carries the
 * existing account's id so the caller pivots to granting the role on that
 * account through `addRoleToExistingUserAction`.
 */
type CreateUserActionResult =
  | { success: true }
  | { success: false; error: string; existingUserId?: string };

async function verifySecretaryAccess(): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session?.roles?.includes(ROLES.SECRETARY)) {
    return { success: false, error: "Secretary access required" };
  }
  return { success: true };
}

export async function createUserBySecretaryAction(
  formData: FormData
): Promise<CreateUserActionResult> {
  const access = await verifySecretaryAccess();
  if (!access.success) {
    return access;
  }

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    program_id: formData.get("program_id") || undefined,
    program_ids: formData.getAll("program_ids"),
    major_id: formData.get("major_id") || undefined,
    year_level: formData.get("year_level") || undefined,
    section: formData.get("section") || undefined,
    graduation_year: formData.get("graduation_year") || undefined,
    company_name: formData.get("company_name") || undefined,
    position: formData.get("position") || undefined,
  };

  const parsed = createUserBySecretarySchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const result = await createUserBySecretary(parsed.data);

  if (!result.success) {
    // An existing account is a pivot, not a creation failure: hand the caller
    // the account id so it can offer to grant the role instead.
    if ("existingUserId" in result) {
      return {
        success: false,
        error: result.error,
        existingUserId: result.existingUserId,
      };
    }

    return { success: false, error: result.error };
  }

  revalidatePath("/secretary/users");
  return { success: true };
}
