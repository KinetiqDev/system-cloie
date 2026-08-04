import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";
import { z } from "zod";
import { assertValidSemesterTerm } from "@/lib/constants/academic-period";

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
}, z.string().max(1000).optional());

const programHeadCourseFields = {
  programId: z.string().uuid("Invalid Program ID."),
  course_type: z.enum(["program-wide", "major-specific"]).default("program-wide"),
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
  description: optionalTextField,
  course_scope: z.literal(CourseScope.PROGRAM_SPECIFIC, {
    message: "Program Heads can only create program-specific courses.",
  }),
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

function validateCourseInput(
  data: {
    course_type: "program-wide" | "major-specific";
    major_id?: string;
    default_semester?: AcademicSemester;
    default_term?: AcademicTerm | null;
  },
  context: z.RefinementCtx
) {
  if (data.course_type === "major-specific" && !data.major_id) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select a major for a major-specific course.",
      path: ["major_id"],
    });
  }

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

export const createProgramHeadCourseSchema = z
  .object(programHeadCourseFields)
  .superRefine(validateCourseInput);

export const updateProgramHeadCourseSchema = z
  .object({
    id: z.string().uuid(),
    ...programHeadCourseFields,
  })
  .superRefine(validateCourseInput);

export type CreateProgramHeadCourseInput = z.infer<typeof createProgramHeadCourseSchema>;
export type UpdateProgramHeadCourseInput = z.infer<typeof updateProgramHeadCourseSchema>;

export const toggleProgramHeadCourseSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  id: z.string().uuid("Invalid Course ID."),
  is_active: z.boolean(),
});

export type ToggleProgramHeadCourseInput = z.infer<typeof toggleProgramHeadCourseSchema>;
