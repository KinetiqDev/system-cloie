import { z } from "zod";

const iloFields = {
  code: z
    .string()
    .trim()
    .min(1, "Institutional Outcome code is required.")
    .max(20, "Institutional Outcome code must be 20 characters or fewer.")
    .transform((value) => value.toUpperCase()),
  description: z
    .string()
    .trim()
    .min(3, "Description must be at least 3 characters.")
    .max(1000, "Description must be 1000 characters or fewer."),
};

export const createILOSchema = z.object({
  ...iloFields,
});

export const updateILOSchema = z.object({
  id: z.string().uuid("Invalid Institutional Outcome ID."),
  ...iloFields,
});

export const iloActionSchema = z.object({
  id: z.string().uuid("Invalid Institutional Outcome ID."),
});

export const reorderILOsSchema = z.object({
  orderedIds: z.array(z.string().uuid("Invalid Institutional Outcome ID.")),
});

export type CreateILOInput = z.infer<typeof createILOSchema>;
export type UpdateILOInput = z.infer<typeof updateILOSchema>;
