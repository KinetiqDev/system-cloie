import { z } from "zod";

import { COURSE_IMPORT_MAX_ROWS, type CourseImportMode } from "../types/course-import";

const courseImportModeSchema = z.enum(["secretary", "program-head", "general-education"]);

const courseImportInputRowSchema = z.object({
  sourceIndex: z.number().int().min(2).max(100_000),
  input: z.record(z.string(), z.string()),
});
export type CourseImportRequestRow = z.infer<typeof courseImportInputRowSchema>;

function validateModeContext(
  value: { mode: CourseImportMode; selectedProgramId?: string; rows: CourseImportRequestRow[] },
  context: z.RefinementCtx
) {
  if (value.mode === "program-head" && !value.selectedProgramId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["selectedProgramId"],
      message: "A selected Program is required for Program Head imports.",
    });
  }

  if (value.mode !== "program-head" && value.selectedProgramId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["selectedProgramId"],
      message: "A selected Program is only valid for Program Head imports.",
    });
  }

  const sourceIndexes = value.rows.map((row) => row.sourceIndex);
  if (new Set(sourceIndexes).size !== sourceIndexes.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rows"],
      message: "Each Course row must have a unique source row number.",
    });
  }
}

export const courseImportRequestSchema = z
  .object({
    mode: courseImportModeSchema,
    selectedProgramId: z.string().uuid().optional(),
    rows: z
      .array(courseImportInputRowSchema)
      .min(1, "Add at least one Course row.")
      .max(COURSE_IMPORT_MAX_ROWS, `Imports are limited to ${COURSE_IMPORT_MAX_ROWS} rows.`),
  })
  .superRefine(validateModeContext);

export type CourseImportRequest = z.infer<typeof courseImportRequestSchema>;

export const courseImportConfirmationRequestSchema = courseImportRequestSchema;
export type CourseImportConfirmationRequest = CourseImportRequest;
