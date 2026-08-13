import { StudentSection, SystemRole, YearLevel } from "@prisma/client";
import { z } from "zod";
import { isInstitutionalEmail } from "@/lib/utils/email-domain";

export const INSTITUTIONAL_EMAIL_MESSAGE =
  "An ACD institutional email (@acd.edu.ph or @acdeducation.com) is required for this role.";

const optionalUuidField = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().uuid().optional()
);

const optionalTextField = z.preprocess((v) => {
  if (typeof v !== "string") {
    return undefined;
  }

  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const optionalEnumField = <TEnum extends Record<string, string>>(enumObject: TEnum) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.nativeEnum(enumObject).optional()
  );

const optionalNumberField = z.preprocess((v) => {
  if (v === "" || v == null) {
    return undefined;
  }
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}, z.number().int().positive().optional());

/**
 * Roles that require an ACD institutional email when created by a Secretary.
 */
const INSTITUTIONAL_EMAIL_ROLES: SystemRole[] = [
  SystemRole.SECRETARY,
  SystemRole.DEAN,
  SystemRole.PROGRAM_HEAD,
  SystemRole.FACULTY,
  SystemRole.STUDENT,
];

/**
 * Roles that require a program selection at creation time.
 */
const PROGRAM_REQUIRED_ROLES: SystemRole[] = [
  SystemRole.PROGRAM_HEAD,
  SystemRole.FACULTY,
  SystemRole.STUDENT,
  SystemRole.ALUMNI,
];

export const createUserBySecretarySchema = z
  .object({
    // Provisional opaque account name (ADR 0014). Replaced by Google-derived
    // name on first OAuth link; Secretary may correct after linking.
    name: z.string().trim().min(1, "Name is required.").max(200),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .transform((v) => v.toLowerCase()),
    role: z.nativeEnum(SystemRole),
    program_id: optionalUuidField,
    major_id: optionalUuidField,
    student_id_number: optionalTextField,
    year_level: optionalEnumField(YearLevel),
    section: optionalEnumField(StudentSection),
    graduation_year: optionalNumberField,
    company_name: optionalTextField,
    position: optionalTextField,
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
  )
  .refine(
    (data) => {
      if (data.role !== SystemRole.STUDENT) {
        return true;
      }
      return !!data.student_id_number;
    },
    {
      message: "Student ID number is required.",
      path: ["student_id_number"],
    }
  )
  .refine(
    (data) => {
      if (data.role !== SystemRole.STUDENT) {
        return true;
      }
      return !!data.year_level;
    },
    {
      message: "Year level is required.",
      path: ["year_level"],
    }
  )
  .refine(
    (data) => {
      if (data.role !== SystemRole.STUDENT) {
        return true;
      }
      return !!data.section;
    },
    {
      message: "Section is required.",
      path: ["section"],
    }
  )
  .refine(
    (data) => {
      if (data.role !== SystemRole.ALUMNI) {
        return true;
      }
      return typeof data.graduation_year === "number" && data.graduation_year > 0;
    },
    {
      message: "Graduation year is required.",
      path: ["graduation_year"],
    }
  )
  // The schema cannot know whether a selected program has active majors, so the
  // conditional major requirement for Student and Alumni is enforced by the
  // creation service (and by the client-side guard in the dynamic form).
  .refine(
    (data) => {
      if (data.role !== SystemRole.INDUSTRY_PARTNER) {
        return true;
      }
      return !!data.company_name && data.company_name.length >= 2;
    },
    {
      message: "Company or organization name is required.",
      path: ["company_name"],
    }
  );

export type CreateUserBySecretaryInput = z.infer<typeof createUserBySecretarySchema>;
