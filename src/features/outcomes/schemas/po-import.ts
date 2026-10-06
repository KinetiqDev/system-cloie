import { z } from "zod";

import { PO_IMPORT_MAX_ROWS } from "../types/po-import";

const sourceRowSchema = z.object({
  sourceIndex: z.number().int().min(2).max(100_000),
  input: z.object({
    po_code: z.string(),
    description: z.string(),
  }),
});

export const poImportRequestSchema = z
  .object({
    programId: z.string().uuid("Invalid Program ID."),
    rows: z
      .array(sourceRowSchema)
      .min(1, "Add at least one PO row.")
      .max(PO_IMPORT_MAX_ROWS, `Imports are limited to ${PO_IMPORT_MAX_ROWS} PO rows.`),
  })
  .superRefine((value, context) => {
    const sourceIndexes = value.rows.map((row) => row.sourceIndex);
    if (new Set(sourceIndexes).size !== sourceIndexes.length) {
      context.addIssue({
        code: "custom",
        path: ["rows"],
        message: "Each PO row must have a unique source row number.",
      });
    }
  });

export type POImportRequest = z.infer<typeof poImportRequestSchema>;
