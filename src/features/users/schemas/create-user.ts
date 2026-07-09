import { SystemRole } from "@prisma/client";
import { z } from "zod";
import { isInstitutionalEmail } from "@/lib/utils/email-domain";

export const INSTITUTIONAL_EMAIL_MESSAGE =
  "An ACD institutional email (@acd.edu.ph or @acdeducation.com) is required for this role.";

const optionalUuidField = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().uuid().optional()
);

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
    program_id: optionalUuidField,
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
  )
  .refine(
    (data) => {
      if (!PROGRAM_REQUIRED_ROLES.includes(data.role)) {
        return true;
      }
      return !!data.program_id;
    },
    {
      message: "Select an affiliated program.",
      path: ["program_id"],
    }
  );

export type CreateUserBySecretaryInput = z.infer<typeof createUserBySecretarySchema>;
