import { z } from "zod";
import { YearLevel, StudentSection, VerificationStatus } from "@prisma/client";

/**
 * Base identity fields editable for any account through the Secretary
 * role-based user edit flow. Email and CLOIE account role remain immutable
 * and are not part of this schema.
 */
export const baseIdentityEditSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "First name is required.")
    .max(100, "First name must be 100 characters or fewer."),
  last_name: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(100, "Last name must be 100 characters or fewer."),
});

export type BaseIdentityEditInput = z.infer<typeof baseIdentityEditSchema>;

/**
 * Student-specific edit fields for static profile and optional current placement.
 * Handled via superRefine in the combined schema to enforce conditional logic.
 */
export const studentEditSchema = z.object({
  student_id_number: z.string().trim().min(1, "Student ID number is required."),
  program_id: z.string().uuid("Program is required."),
  major_id: z.string().uuid("Major is required.").nullable().optional(),
  year_level: z.nativeEnum(YearLevel, { message: "Year level is required." }).nullable().optional(),
  section: z.nativeEnum(StudentSection, { message: "Section is required." }).nullable().optional(),
});

export type StudentEditInput = z.infer<typeof studentEditSchema>;

export const alumniEditSchema = z.object({
  graduation_year: z.coerce
    .number()
    .int("Graduation year must be a whole number")
    .min(1950)
    .max(new Date().getFullYear() + 5),
  program_id: z.string().uuid("Program is required."),
  major_id: z.string().uuid("Major is invalid.").nullable().optional(),
  verification_status: z.nativeEnum(VerificationStatus, {
    message: "Verification status is required.",
  }),
});

export type AlumniEditInput = z.infer<typeof alumniEditSchema>;

export const industryPartnerEditSchema = z.object({
  company_name: z.string().trim().min(1, "Organization name is required."),
  position: z.string().trim().nullable().optional(),
  program_id: z.string().uuid("Affiliated program is invalid.").nullable().optional(),
  verification_status: z.nativeEnum(VerificationStatus, {
    message: "Verification status is required.",
  }),
});

export type IndustryPartnerEditInput = z.infer<typeof industryPartnerEditSchema>;

/**
 * Secretary-managed edit request for the base identity of an account, and any
 * role-specific details. The CLOIE account role and email are intentionally
 * absent: the server enforces them as immutable at the service layer.
 */
export const editUserBySecretarySchema = z
  .object({
    id: z.string().uuid(),
    confirmationToken: z.string().optional(), // Token for protected edits
  })
  .merge(baseIdentityEditSchema)
  .merge(
    z.object({
      student: studentEditSchema.optional(),
      faculty: z
        .object({
          program_id: z.string().uuid("Program is required."),
        })
        .optional(),
      program_head: z
        .object({
          program_id: z.string().uuid("Program is required."),
        })
        .optional(),
      alumni: alumniEditSchema.optional(),
      industry_partner: industryPartnerEditSchema.optional(),
    })
  );

export type EditUserBySecretaryInput = z.infer<typeof editUserBySecretarySchema>;
