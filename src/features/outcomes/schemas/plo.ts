import { z } from "zod";

export const ploDetailsSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "PLO code is required.")
    .max(20, "PLO code must be 20 characters or fewer.")
    .transform((value) => value.toUpperCase()),
  description: z
    .string()
    .trim()
    .min(3, "Description must be at least 3 characters.")
    .max(1000, "Description must be 1000 characters or fewer."),
});

const ploFields = ploDetailsSchema.shape;

export const createPLOSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  ...ploFields,
});

export const updatePLOSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  id: z.string().uuid("Invalid PLO ID."),
  ...ploFields,
});

export const programHeadPLOActionSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  id: z.string().uuid("Invalid PLO ID."),
});

export const reorderPLOsSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  orderedIds: z.array(z.string().uuid("Invalid PLO ID.")),
});

export type CreatePLOInput = z.infer<typeof createPLOSchema>;
export type UpdatePLOInput = z.infer<typeof updatePLOSchema>;
