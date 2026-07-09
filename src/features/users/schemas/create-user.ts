import { SystemRole } from "@prisma/client";
import { z } from "zod";
import { isInstitutionalEmail } from "@/lib/utils/email-domain";

export const INSTITUTIONAL_EMAIL_MESSAGE =
  "An ACD institutional email (@acd.edu.ph or @acdeducation.com) is required for this role.";

/**
 * Roles that require an ACD institutional email when created by a Secretary.
 */
const INSTITUTIONAL_EMAIL_ROLES: SystemRole[] = [
  SystemRole.SECRETARY,
  SystemRole.DEAN,
];

export const createUserBySecretarySchema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required.").max(100),
    last_name: z.string().trim().min(1, "Last name is required.").max(100),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .transform((v) => v.toLowerCase()),
    role: z.nativeEnum(SystemRole),
  })
  .refine(
    (data) => {
      if (!INSTITUTIONAL_EMAIL_ROLES.includes(data.role)) {
        return true;
      }
      return isInstitutionalEmail(data.email);
    },
    {
      message: INSTITUTIONAL_EMAIL_MESSAGE,
      path: ["email"],
    }
  );

export type CreateUserBySecretaryInput = z.infer<typeof createUserBySecretarySchema>;
