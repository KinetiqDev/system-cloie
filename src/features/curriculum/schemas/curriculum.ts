import { z } from "zod";
import { AcademicSemester, AcademicTerm, YearLevel } from "@prisma/client";
import { assertValidSemesterTerm } from "@/lib/constants/academic-period";

const semesterEnum = z.enum([AcademicSemester.FIRST, AcademicSemester.SECOND, AcademicSemester.SUMMER], {
  message: "Semester must be FIRST, SECOND, or SUMMER",
});

const termEnum = z.enum([AcademicTerm.FIRST_TERM, AcademicTerm.SECOND_TERM], {
  message: "Term must be FIRST_TERM or SECOND_TERM",
}).nullable();

const yearLevelEnum = z.enum(
  [YearLevel.FIRST_YEAR, YearLevel.SECOND_YEAR, YearLevel.THIRD_YEAR, YearLevel.FOURTH_YEAR],
  { message: "Year level must be FIRST_YEAR, SECOND_YEAR, THIRD_YEAR, or FOURTH_YEAR" }
);

/**
 * Zod schema for creating a Curriculum Version.
 * Zod schema for creating a Curriculum Version.
 */
export const createCurriculumVersionSchema = z.object({
  programId: z.string().uuid("Invalid program ID"),
  majorId: z.string().uuid("Invalid major ID").nullable().optional(),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(50, "Code must be at most 50 characters"),
  name: z.string().trim().max(200, "Name must be at most 200 characters").nullable().optional(),
  effectiveFromSchoolYearId: z.string().uuid("Invalid school year ID").nullable().optional(),
});

/**
 * Zod schema for publishing a Curriculum Version.
 */
export const publishCurriculumVersionSchema = z.object({
  id: z.string().uuid("Invalid curriculum version ID"),
});

/**
 * Zod schema for retiring a Curriculum Version.
 */
export const retireCurriculumVersionSchema = publishCurriculumVersionSchema;

/**
 * Zod schema for cloning a Curriculum Version.
 */
export const cloneCurriculumVersionSchema = publishCurriculumVersionSchema;

/**
 * Zod schema for adding a Course to a DRAFT Curriculum Version.
 * Rejects SUMMER with a term and FIRST/SECOND without a term.
 */
export const addCurriculumCourseSchema = z
  .object({
    curriculumVersionId: z.string().uuid("Invalid curriculum version ID"),
    courseId: z.string().uuid("Invalid course ID"),
    yearLevel: yearLevelEnum,
    semester: semesterEnum,
    term: termEnum.optional(),
  })
  .superRefine((data, ctx) => {
    const term = data.term ?? null;
    const check = assertValidSemesterTerm(data.semester, term);
    if (!check.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: check.error, path: ["term"] });
    }
  });

/**
 * Zod schema for updating a Curriculum Course placement. When both semester
 * and term are supplied they must form a valid pair. Partial updates skip the
 * pair check here — the service merges the supplied fields with the stored
 * placement and validates the merged result before mutating.
 */
export const updateCurriculumCourseSchema = z
  .object({
    id: z.string().uuid("Invalid curriculum course ID"),
    yearLevel: yearLevelEnum.optional(),
    semester: semesterEnum.optional(),
    term: termEnum.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.semester === undefined || data.term === undefined) return;
    const check = assertValidSemesterTerm(data.semester, data.term);
    if (!check.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: check.error, path: ["term"] });
    }
  })
  .refine(
    (data) =>
      data.yearLevel !== undefined || data.semester !== undefined || data.term !== undefined,
    { message: "At least one placement field is required" }
  );

/**
 * Zod schema for removing a Curriculum Course placement.
 */
export const removeCurriculumCourseSchema = z.object({
  id: z.string().uuid("Invalid curriculum course ID"),
});
