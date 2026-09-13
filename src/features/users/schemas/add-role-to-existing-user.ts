import { StudentSection, SystemRole, YearLevel } from "@prisma/client";
import { z } from "zod";
import { isInstitutionalEmail } from "@/lib/utils/email-domain";
import { INSTITUTIONAL_EMAIL_MESSAGE } from "./create-user";

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
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.nativeEnum(enumObject).optional());

const optionalNumberField = z.preprocess((v) => {
  if (v === "" || v == null) {
    return undefined;
  }
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}, z.number().int().positive().optional());

/**
 * Roles that require a program selection when the role is added to an
 * existing account. Mirrors the creation-time rule in `create-user.ts`.
 */
const PROGRAM_REQUIRED_ROLES: SystemRole[] = [
  SystemRole.PROGRAM_HEAD,
  SystemRole.FACULTY,
  SystemRole.STUDENT,
  SystemRole.ALUMNI,
];

/**
 * Roles that require an ACD institutional email when the role is added.
 * Mirrors the rule enforced by `addRoleToExistingUserAction`.
 */
const INSTITUTIONAL_EMAIL_ROLES: SystemRole[] = [
  SystemRole.SECRETARY,
  SystemRole.DEAN,
  SystemRole.PROGRAM_HEAD,
  SystemRole.FACULTY,
  SystemRole.STUDENT,
  SystemRole.GEN_ED_COORDINATOR,
];

/**
 * Client-side validation for the "add a role to an existing account" branch of
 * the Secretary add-user form. `name` is intentionally omitted because the
 * account already exists; the email is only read back for the institutional
 * domain rule. The authoritative validation remains the
 * `addRoleToExistingUserAction` service.
 */
export const addRoleToExistingUserFormSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address."),
    role: z.nativeEnum(SystemRole),
    program_id: optionalUuidField,
    major_id: optionalUuidField,
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

export type AddRoleToExistingUserFormInput = z.infer<typeof addRoleToExistingUserFormSchema>;
