import { AcademicSemester, AcademicTerm, YearLevel } from "@prisma/client";
import { z } from "zod";

import { assertValidSemesterTerm } from "@/lib/constants/academic-period";

/** Course catalog naming, shared by every surface that writes a Course. */
export const courseCodeField = z
  .string()
  .trim()
  .min(2, "Course code must be at least 2 characters.")
  .max(20, "Course code must be 20 characters or fewer.")
  .transform((value) => value.toUpperCase());

export const courseTitleField = z
  .string()
  .trim()
  .min(3, "Course title must be at least 3 characters.")
  .max(200, "Course title must be 200 characters or fewer.");

/** Optional foreign key: a blank or null FormData cell reads as "not set". */
export const optionalUuidField = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.string().uuid().optional()
);

/** Schedule defaults every Course records; a blank cell reads as "no default". */
export const courseTemporalFields = {
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

/**
 * A Course that sets either default must name a semester-term pair the
 * Academic Calendar allows; a term without a semester is rejected too.
 */
export function validateCourseSemesterTerm(
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
