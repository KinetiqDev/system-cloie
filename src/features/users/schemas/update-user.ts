import { z } from "zod";

export const updateUserBySecretarySchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(200, "Name must be 200 characters or fewer."),
});

export type UpdateUserBySecretaryInput = z.infer<typeof updateUserBySecretarySchema>;
