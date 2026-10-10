import { z } from "zod";

import { PO_IMPORT_MAX_ROWS } from "../types/po-import";

const sourceRowSchema = z.object({
  sourceIndex: z.number().int().min(2).max(100_000),
  input: z.object({
    po_code: z.string(),
    description: z.string(),
    classification: z.string().optional(),
  }),
});

export const poImportRequestSchema = z
  .object({
    programId: z.string().uuid("Invalid Program ID."),
    classification: z.enum(["CORE", "PROFESSIONAL"]).optional(),
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
    // Every ready row needs a real Core/Professional category from its own
    // Classification column or the import-dialog selection; administrative
    // categories never enter a Program Head import (ADR 0040).
    if (
      !value.classification &&
      value.rows.some((row) => {
        const parsed = row.input.classification?.trim().toUpperCase();
        return parsed !== "CORE" && parsed !== "PROFESSIONAL";
      })
    ) {
      context.addIssue({
        code: "custom",
        path: ["classification"],
        message: "Select Core or Professional for rows without a Classification column.",
      });
    }
  });

export type POImportRequest = z.infer<typeof poImportRequestSchema>;
