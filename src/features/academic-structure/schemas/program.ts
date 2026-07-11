import { z } from "zod";

export const createProgramSchema = z.object({
  code: z
    .string()
    .min(2, "Program code must be at least 2 characters")
    .max(20, "Program code must be at most 20 characters")
    .transform((val) => val.trim().toUpperCase()),
  name: z
    .string()
    .min(3, "Program name must be at least 3 characters")
    .max(200, "Program name must be at most 200 characters")
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional()
    .transform((val) => val?.trim() || undefined),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;

export const updateProgramSchema = z.object({
  id: z.string().uuid(),
  code: z
    .string()
    .min(2, "Program code must be at least 2 characters")
    .max(20, "Program code must be at most 20 characters")
    .transform((val) => val.trim().toUpperCase()),
  name: z
    .string()
    .min(3, "Program name must be at least 3 characters")
    .max(200, "Program name must be at most 200 characters")
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional()
    .transform((val) => val?.trim() || undefined),
  is_active: z.boolean().optional(),
});

export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;

export const createMajorSchema = z.object({
  program_id: z.string().uuid(),
  name: z
    .string()
    .min(2, "Major name must be at least 2 characters")
    .max(200, "Major name must be at most 200 characters")
    .transform((val) => val.trim()),
});

export type CreateMajorInput = z.infer<typeof createMajorSchema>;

export const updateMajorSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(2, "Major name must be at least 2 characters")
    .max(200, "Major name must be at most 200 characters")
    .transform((val) => val.trim()),
  is_active: z.boolean().optional(),
});

export type UpdateMajorInput = z.infer<typeof updateMajorSchema>;
