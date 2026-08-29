import { z } from "zod";

import { PLO_IMPORT_MAX_ROWS } from "../types/plo-import";

const sourceRowSchema = z.object({
  sourceIndex: z.number().int().min(2).max(100_000),
  input: z.object({
    plo_code: z.string(),
    description: z.string(),
  }),
});

export const ploImportRequestSchema = z
  .object({
    programId: z.string().uuid("Invalid Program ID."),
    rows: z
      .array(sourceRowSchema)
      .min(1, "Add at least one PLO row.")
      .max(PLO_IMPORT_MAX_ROWS, `Imports are limited to ${PLO_IMPORT_MAX_ROWS} PLO rows.`),
  })
  .superRefine((value, context) => {
    const sourceIndexes = value.rows.map((row) => row.sourceIndex);
    if (new Set(sourceIndexes).size !== sourceIndexes.length) {
      context.addIssue({
        code: "custom",
        path: ["rows"],
        message: "Each PLO row must have a unique source row number.",
      });
    }
  });

export type PLOImportRequest = z.infer<typeof ploImportRequestSchema>;
