import { z } from "zod";

import { GO_IMPORT_MAX_ROWS } from "../types/go-import";

const sourceRowSchema = z.object({
  sourceIndex: z.number().int().min(2).max(100_000),
  input: z.object({
    go_code: z.string(),
    description: z.string(),
  }),
});

export const goImportRequestSchema = z
  .object({
    programId: z.string().uuid("Invalid Program ID."),
    rows: z
      .array(sourceRowSchema)
      .min(1, "Add at least one GO row.")
      .max(GO_IMPORT_MAX_ROWS, `Imports are limited to ${GO_IMPORT_MAX_ROWS} GO rows.`),
  })
  .superRefine((value, context) => {
    const sourceIndexes = value.rows.map((row) => row.sourceIndex);
    if (new Set(sourceIndexes).size !== sourceIndexes.length) {
      context.addIssue({
        code: "custom",
        path: ["rows"],
        message: "Each GO row must have a unique source row number.",
      });
    }
  });

export type GOImportRequest = z.infer<typeof goImportRequestSchema>;
