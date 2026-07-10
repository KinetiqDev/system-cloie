import { z } from "zod";
import { SystemRole, YearLevel, StudentSection } from "@prisma/client";

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

/**
 * Secretary-managed edit request for the base identity of an account, and any
 * role-specific details. The CLOIE account role and email are intentionally
 * absent: the server enforces them as immutable at the service layer.
 */
export const editUserBySecretarySchema = z
  .object({
    id: z.string().uuid(),
    role: z.nativeEnum(SystemRole), // Sent for routing/validation, but not updated
    confirmationToken: z.string().optional(), // Token for protected edits
  })
  .merge(baseIdentityEditSchema)
  .merge(z.object({
    student: studentEditSchema.optional(),
  }))
  .superRefine((data, ctx) => {
    if (data.role === SystemRole.STUDENT) {
      if (!data.student) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Student details are required for Student accounts.",
          path: ["student"],
        });
        return;
      }
      
      // Year level and section are a pair if one is provided
      const hasYearLevel = !!data.student.year_level;
      const hasSection = !!data.student.section;
      if (hasYearLevel !== hasSection) {
        if (!hasYearLevel) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Year level is required when section is selected.",
            path: ["student", "year_level"],
          });
        }
        if (!hasSection) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Section is required when year level is selected.",
            path: ["student", "section"],
          });
        }
      }
    }
  });

export type EditUserBySecretaryInput = z.infer<typeof editUserBySecretarySchema>;
