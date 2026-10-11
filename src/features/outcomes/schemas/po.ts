import { z } from "zod";

export const poDetailsSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "PO code is required.")
    .max(20, "PO code must be 20 characters or fewer.")
    .transform((value) => value.toUpperCase()),
  description: z
    .string()
    .trim()
    .min(3, "Description must be at least 3 characters.")
    .max(1000, "Description must be 1000 characters or fewer."),
});

const poFields = {
  ...poDetailsSchema.shape,
  classification: z.enum(["CORE", "PROFESSIONAL"], {
    error: "Select Core or Professional.",
  }),
};

export const createPOSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  ...poFields,
});

export const updatePOSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  id: z.string().uuid("Invalid PO ID."),
  ...poFields,
});

export const programHeadPOActionSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  id: z.string().uuid("Invalid PO ID."),
});

export const reorderPOsSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  orderedIds: z.array(z.string().uuid("Invalid PO ID.")),
});

export type CreatePOInput = z.infer<typeof createPOSchema>;
export type UpdatePOInput = z.infer<typeof updatePOSchema>;
