// fallow-ignore-file code-duplication
import { StudentSection, SystemRole, YearLevel } from "@prisma/client";
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

const optionalEnumField = <TEnum extends Record<string, string>>(enumObject: TEnum) =>
  z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.nativeEnum(enumObject).optional()
  );

const optionalNumberField = z.preprocess((value) => {
  if (value === "" || value == null) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}, z.number().int().positive().optional());

export const assignRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.nativeEnum(SystemRole),
});

/**
 * Role grant on an existing account: the account is addressed by `user_id` and
 * the role-specific context mirrors the account-creation fields so both entry
 * points run the same role-entry gates.
 */
export const addRoleToExistingUserSchema = z.object({
  user_id: z.string().uuid(),
  role: z.nativeEnum(SystemRole),
  program_id: optionalUuidField,
  program_ids: z.preprocess(
    (value) => (value == null ? undefined : value),
    z.array(z.string().uuid()).optional()
  ),
  major_id: optionalUuidField,
  year_level: optionalEnumField(YearLevel),
  section: optionalEnumField(StudentSection),
  graduation_year: optionalNumberField,
  company_name: optionalTextField,
  position: optionalTextField,
});

export const createProgramHeadAssignmentSchema = z.object({
  program_head_id: z.string().uuid(),
  program_id: z.string().uuid(),
});

export const deactivateProgramHeadAssignmentSchema = z.object({
  assignment_id: z.string().uuid(),
  program_head_id: z.string().uuid(),
});

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type AddRoleToExistingUserInput = z.infer<typeof addRoleToExistingUserSchema>;
export type CreateProgramHeadAssignmentInput = z.infer<typeof createProgramHeadAssignmentSchema>;
