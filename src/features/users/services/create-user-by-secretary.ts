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
  SystemRole.PROGRAM_HEAD,
  SystemRole.FACULTY,
];

/**
 * Roles that require a program selection at creation time.
 */
const PROGRAM_REQUIRED_ROLES: SystemRole[] = [
  SystemRole.PROGRAM_HEAD,
  SystemRole.FACULTY,
];

export async function createUserBySecretary(
  input: CreateUserBySecretaryInput
): Promise<ServiceResult<{ id: string }>> {
  const {
    first_name,
    last_name,
    email,
    role,
    program_id,
  } = input;

  // 1. Enforce institutional email for internal roles
  if (INSTITUTIONAL_EMAIL_ROLES.includes(role) && !isInstitutionalEmail(email)) {
    return { success: false, error: INSTITUTIONAL_EMAIL_ERROR };
  }

  // 2. Enforce required program for Program Head and Faculty
  if (PROGRAM_REQUIRED_ROLES.includes(role) && !program_id) {
    return { success: false, error: "Select an affiliated program." };
  }

  // 3. Check for duplicate email
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return { success: false, error: "A user with this email already exists." };
  }

  try {
    // 4. Atomic transaction: create user + role + role-specific records
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

      // c. Role-specific records
      switch (role) {
        case SystemRole.FACULTY: {
          if (program_id) {
            await tx.facultyProgramAffiliation.create({
              data: {
                faculty_id: newUser.id,
                program_id,
                is_active: true,
                is_primary: true,
              },
            });
          }
          break;
        }

        case SystemRole.PROGRAM_HEAD: {
          if (program_id) {
            await tx.programHeadAssignment.create({
              data: {
                program_head_id: newUser.id,
                program_id,
                is_active: true,
              },
            });
          }
          break;
        }

        default:
          break;
      }

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
