import { InviteStatus, StudentSection, SystemRole, YearLevel } from "@prisma/client";
import { z } from "zod";

const optionalUuidField = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.string().uuid().optional()
);

const optionalTextField = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().max(255).optional());

const optionalLongTextField = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().max(1000).optional());

export const assignRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.nativeEnum(SystemRole),
});

/**
 * Phase 9: StudentAcademicProfile now only holds static cohort identifiers.
 * Academic year, year level, and section moved to StudentEnrollment ledger.
 */
export const updateStudentAcademicContextSchema = z.object({
  user_id: z.string().uuid(),
  program_id: z.string().uuid(),
  major_id: optionalUuidField,
});

export const createFacultyAffiliationSchema = z.object({
  faculty_id: z.string().uuid(),
  program_id: z.string().uuid(),
});

export const createProgramHeadAssignmentSchema = z.object({
  program_head_id: z.string().uuid(),
  program_id: z.string().uuid(),
});

export const deactivateProgramHeadAssignmentSchema = z.object({
  assignment_id: z.string().uuid(),
  program_head_id: z.string().uuid(),
});

export const updateIndustryPartnerProfileSchema = z.object({
  user_id: z.string().uuid(),
  company_name: z
    .string()
    .trim()
    .min(2, "Company name is required.")
    .max(200, "Company name must be 200 characters or fewer."),
  position: optionalTextField,
  program_id: optionalUuidField,
});

const externalInviteRoleSchema = z.union([
  z.literal(SystemRole.ALUMNI),
  z.literal(SystemRole.INDUSTRY_PARTNER),
]);

export const createExternalInviteDraftSchema = z.object({
  email: z.email("Enter a valid email address.").transform((value) => value.toLowerCase()),
  role: externalInviteRoleSchema,
  program_id: optionalUuidField,
  invitee_name: optionalTextField,
  company_name: optionalTextField,
  note: optionalLongTextField,
});

const updateExternalInviteStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(InviteStatus),
});

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type UpdateStudentAcademicContextInput = z.infer<typeof updateStudentAcademicContextSchema>;
export type CreateFacultyAffiliationInput = z.infer<typeof createFacultyAffiliationSchema>;
export type CreateProgramHeadAssignmentInput = z.infer<typeof createProgramHeadAssignmentSchema>;
export type UpdateIndustryPartnerProfileInput = z.infer<typeof updateIndustryPartnerProfileSchema>;
export type CreateExternalInviteDraftInput = z.infer<typeof createExternalInviteDraftSchema>;
