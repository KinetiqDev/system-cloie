import { z } from "zod";

const goFields = {
  code: z
    .string()
    .trim()
    .min(1, "GO code is required.")
    .max(20, "GO code must be 20 characters or fewer.")
    .transform((value) => value.toUpperCase()),
  description: z
    .string()
    .trim()
    .min(3, "Description must be at least 3 characters.")
    .max(1000, "Description must be 1000 characters or fewer."),
};

export const createGOSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  ...goFields,
});

export const updateGOSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  id: z.string().uuid("Invalid GO ID."),
  ...goFields,
});

export const programHeadGOActionSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  id: z.string().uuid("Invalid GO ID."),
});

export const reorderGOsSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  orderedIds: z.array(z.string().uuid("Invalid GO ID.")),
});

export const createMappingSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  ciloId: z.string().uuid("Invalid CILO ID."),
  goId: z.string().uuid("Invalid GO ID."),
});

export const removeMappingSchema = z.object({
  programId: z.string().uuid("Invalid Program ID."),
  id: z.string().uuid("Invalid mapping ID."),
});

export type CreateGOInput = z.infer<typeof createGOSchema>;
export type UpdateGOInput = z.infer<typeof updateGOSchema>;
