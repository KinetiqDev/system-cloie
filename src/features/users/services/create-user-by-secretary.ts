import { SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isInstitutionalEmail } from "@/lib/utils/email-domain";
import type { CreateUserBySecretaryInput } from "../schemas/create-user";

import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

const INSTITUTIONAL_EMAIL_ERROR =
  "An ACD institutional email (@acd.edu.ph or @acdeducation.com) is required for this role.";

/**
 * Roles that require an ACD institutional email when created by a Secretary.
 */
const INSTITUTIONAL_EMAIL_ROLES: SystemRole[] = [
  SystemRole.SECRETARY,
  SystemRole.DEAN,
];

export async function createUserBySecretary(
  input: CreateUserBySecretaryInput
): Promise<ServiceResult<{ id: string }>> {
  const {
    first_name,
    last_name,
    email,
    role,
  } = input;

  // 1. Enforce institutional email for internal roles
  if (INSTITUTIONAL_EMAIL_ROLES.includes(role) && !isInstitutionalEmail(email)) {
    return { success: false, error: INSTITUTIONAL_EMAIL_ERROR };
  }

  // 2. Check for duplicate email
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return { success: false, error: "A user with this email already exists." };
  }

  try {
    // 3. Atomic transaction: create user + role
    const user = await prisma.$transaction(async (tx) => {
      // a. Create User record
      const newUser = await tx.user.create({
        data: {
          first_name,
          last_name,
          email,
          is_active: true,
        },
      });

      // b. Create UserRole record
      await tx.userRole.create({
        data: {
          user_id: newUser.id,
          role,
        },
      });

      return newUser;
    });

    return { success: true, data: { id: user.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: "A user with this email already exists." };
    }

    throw error;
  }
}
