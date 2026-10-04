import { CourseScope } from "@prisma/client";
import { z } from "zod";

import {
  courseCodeField,
  courseTemporalFields,
  courseTitleField,
  optionalUuidField,
  validateCourseSemesterTerm,
} from "./course-fields";

const programHeadCourseFields = {
  programId: z.string().uuid("Invalid Program ID."),
  course_type: z.enum(["program-wide", "major-specific"]).default("program-wide"),
  code: courseCodeField,
  title: courseTitleField,
  course_scope: z.literal(CourseScope.PROGRAM_SPECIFIC, {
    message: "Program Heads can only create program-specific courses.",
  }),
  major_id: optionalUuidField,
  ...courseTemporalFields,
};

function validateProgramHeadCourse(
  data: z.infer<z.ZodObject<typeof programHeadCourseFields>>,
  context: z.RefinementCtx
) {
  if (data.course_type === "major-specific" && !data.major_id) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select a major for a major-specific course.",
      path: ["major_id"],
    });
  }

  validateCourseSemesterTerm(data, context);
}

export const createProgramHeadCourseSchema = z
  .object(programHeadCourseFields)
  .superRefine(validateProgramHeadCourse);

export const updateProgramHeadCourseSchema = z
  .object({
    id: z.string().uuid(),
    ...programHeadCourseFields,
  })
  .superRefine(validateProgramHeadCourse);

export type CreateProgramHeadCourseInput = z.infer<typeof createProgramHeadCourseSchema>;
export type UpdateProgramHeadCourseInput = z.infer<typeof updateProgramHeadCourseSchema>;

export const toggleProgramHeadCourseSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  id: z.string().uuid("Invalid Course ID."),
  is_active: z.boolean(),
});

export type ToggleProgramHeadCourseInput = z.infer<typeof toggleProgramHeadCourseSchema>;
