import { CourseScope } from "@prisma/client";
import { z } from "zod";

import {
  courseCodeField,
  courseTemporalFields,
  courseTitleField,
  optionalUuidField,
  validateCourseSemesterTerm,
} from "./course-fields";

const courseFields = {
  code: courseCodeField,
  title: courseTitleField,
  course_scope: z.nativeEnum(CourseScope),
  program_id: optionalUuidField,
  major_id: optionalUuidField,
  ...courseTemporalFields,
};

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
  .superRefine(validateCourseSemesterTerm)
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
  .superRefine(validateCourseSemesterTerm)
  .superRefine(validateCourseRelationships);

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
