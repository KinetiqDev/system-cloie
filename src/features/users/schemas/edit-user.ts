import { z } from "zod";

/**
 * Base identity fields editable for any account through the Secretary
 * role-based user edit flow. Email and CLOIE account role remain immutable
 * and are not part of this schema.
 */
export const baseIdentityEditSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "First name is required.")
    .max(100, "First name must be 100 characters or fewer."),
  last_name: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(100, "Last name must be 100 characters or fewer."),
});

export type BaseIdentityEditInput = z.infer<typeof baseIdentityEditSchema>;

/**
 * Secretary-managed edit request for the base identity of an account. The
 * CLOIE account role and email are intentionally absent: the server enforces
 * them as immutable at the service layer.
 */
export const editUserBySecretarySchema = baseIdentityEditSchema.extend({
  id: z.string().uuid(),
});

export type EditUserBySecretaryInput = z.infer<typeof editUserBySecretarySchema>;
