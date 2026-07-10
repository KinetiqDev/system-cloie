import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { type ServiceResult } from "@/lib/utils/service-result";
import {
  type EditUserBySecretaryInput,
  editUserBySecretarySchema,
} from "../schemas/edit-user";

/**
 * Secretary role-based user edit service. #80 establishes the deep-module
 * write seam and base identity behavior. Subsequent role slices (#81–#85)
 * extend the protected-change detection, confirmation protocol, and
 * role-specific record updates without reshaping this surface.
 */
export async function editUserBySecretary(
  rawInput: EditUserBySecretaryInput
): Promise<ServiceResult<{ id: string }>> {
  const parsed = editUserBySecretarySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const session = await resolveAuthSession();
  if (!session?.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  if (session.activeRole !== ROLES.SECRETARY) {
    return { success: false, error: "Secretary access required." };
  }

  const { id, first_name, last_name } = parsed.data;

  if (id === session.userId) {
    return { success: false, error: "Cannot edit your own account." };
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, is_active: true },
  });

  if (!existing) {
    return { success: false, error: "User not found." };
  }

  // Inactive accounts remain editable per #79; no is_active guard here.
  // Email and CLOIE account role are immutable in this feature: the schema
  // intentionally excludes them, and the service does not read or write
  // them.
  await prisma.user.update({
    where: { id },
    data: {
      first_name,
      last_name,
    },
  });

  return { success: true, data: { id } };
}
