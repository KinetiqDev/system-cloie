import { z } from "zod";

const institutionalOutcomeFields = {
  code: z
    .string()
    .trim()
    .min(1, "Institutional Outcome code is required.")
    .max(20, "Institutional Outcome code must be 20 characters or fewer.")
    .transform((value) => value.toUpperCase()),
  description: z
    .string()
    .trim()
    .min(3, "Statement must be at least 3 characters.")
    .max(1000, "Statement must be 1000 characters or fewer."),
};

export const institutionalOutcomeDraftSchema = z.object(institutionalOutcomeFields);
export type InstitutionalOutcomeDraft = z.infer<typeof institutionalOutcomeDraftSchema>;

export const institutionalOutcomeIdSchema = z.string().uuid("Invalid Institutional Outcome ID.");
export const reorderInstitutionalOutcomesSchema = z.object({
  orderedIds: z.array(z.string().uuid("Invalid Institutional Outcome ID.")).min(1),
});

export const institutionalOutcomeWriteInputSchema = z.discriminatedUnion("action", [
  z.object({ kind: z.literal("ILO"), action: z.literal("create"), ...institutionalOutcomeFields }),
  z.object({
    kind: z.literal("ILO"),
    action: z.literal("update"),
    id: institutionalOutcomeIdSchema,
    ...institutionalOutcomeFields,
  }),
  z.object({
    kind: z.literal("ILO"),
    action: z.literal("archive"),
    id: institutionalOutcomeIdSchema,
  }),
  z.object({
    kind: z.literal("ILO"),
    action: z.literal("restore"),
    id: institutionalOutcomeIdSchema,
  }),
  z.object({
    kind: z.literal("ILO"),
    action: z.literal("reorder"),
    orderedIds: reorderInstitutionalOutcomesSchema.shape.orderedIds,
  }),
]);

export const institutionalOutcomeReviewSchema = z.object({
  input: institutionalOutcomeWriteInputSchema,
  before: z.unknown(),
  after: z.unknown(),
  freshnessToken: z.string(),
  signature: z.string().regex(/^[0-9a-f]+$/i),
});

export type InstitutionalOutcomeWriteInput = z.infer<typeof institutionalOutcomeWriteInputSchema>;
