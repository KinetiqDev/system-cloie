import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";
import { z } from "zod";
import { assertValidSemesterTerm } from "@/lib/constants/academic-period";

const optionalUuidField = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.string().uuid().optional()
);

const courseFields = {
  code: z
    .string()
    .trim()
    .min(2, "Course code must be at least 2 characters.")
    .max(20, "Course code must be 20 characters or fewer.")
    .transform((value) => value.toUpperCase()),
  title: z
    .string()
    .trim()
    .min(3, "Course title must be at least 3 characters.")
    .max(200, "Course title must be 200 characters or fewer."),
  course_scope: z.nativeEnum(CourseScope),
  program_id: optionalUuidField,
  major_id: optionalUuidField,
  default_year_level: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.nativeEnum(YearLevel).optional()
  ),
  default_semester: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.nativeEnum(AcademicSemester).optional()
  ),
  default_term: z.preprocess(
    (value) => (value === "" || value == null || value === "null" ? null : value),
    z.nativeEnum(AcademicTerm).nullable().optional()
  ),
};

function validateSemesterTerm(
  data: { default_semester?: AcademicSemester; default_term?: AcademicTerm | null },
  context: z.RefinementCtx
) {
  if (data.default_semester !== undefined) {
    const result = assertValidSemesterTerm(data.default_semester, data.default_term ?? null);
    if (!result.valid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error,
        path: ["default_semester"],
      });
    }
  } else if (data.default_term !== undefined && data.default_term !== null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Semester must be set if term is set.",
      path: ["default_semester"],
    });
  }
}

function validateCourseRelationships(
  data: { course_scope: CourseScope; program_id?: string | null; major_id?: string | null },
  context: z.RefinementCtx
) {
  if (data.course_scope === CourseScope.GENERAL_EDUCATION) {
    if (data.program_id || data.major_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "General education courses cannot be tied to a program or major.",
        path: ["course_scope"],
      });
    }

    return;
  }

  if (!data.program_id) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Program-specific courses require a program.",
      path: ["program_id"],
    });
  }

  if (data.major_id && !data.program_id) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select a program before selecting a major.",
      path: ["major_id"],
    });
  }
}

export const createCourseSchema = z
  .object(courseFields)
  .superRefine(validateSemesterTerm)
  .superRefine(validateCourseRelationships);

export const updateCourseSchema = z
  .object({
    id: z.string().uuid(),
    ...courseFields,
    // Optimistic concurrency token: ISO timestamp of the loaded snapshot.
    // Absent (legacy callers) -> unconditional update.
    updated_at: z.preprocess(
      (value) => (value === "" || value == null ? undefined : value),
      z.string().datetime().optional()
    ),
  })
  .superRefine(validateSemesterTerm)
  .superRefine(validateCourseRelationships);

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
