import { z } from "zod";

/**
 * Entry-scoped validation for the public external (Alumni / Industry Partner)
 * email-first flows. These schemas cover transport shape only — account
 * existence, provider linkage, verification, and approval remain
 * server-resolved in `src/lib/actions/external-entry-actions.ts` so public
 * responses stay enumeration-neutral.
 */

const emailField = z.email("Enter a valid email address.").max(254, "Enter a valid email address.");

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.");

export const externalRoleSchema = z.enum(["ALUMNI", "INDUSTRY_PARTNER"]);

export type ExternalRole = z.infer<typeof externalRoleSchema>;

export const externalEmailContinueSchema = z.object({
  email: emailField,
});

export type ExternalEmailContinueInput = z.infer<typeof externalEmailContinueSchema>;

export const externalSignInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password.").max(128),
});

export type ExternalSignInInput = z.infer<typeof externalSignInSchema>;

export const externalRegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name as it should appear on your account.")
    .max(120, "Name must be 120 characters or fewer."),
  email: emailField,
  password: passwordField,
  role: externalRoleSchema,
});

export type ExternalRegisterInput = z.infer<typeof externalRegisterSchema>;

export const externalRegisterFormSchema = externalRegisterSchema;

export type ExternalRegisterFormValues = ExternalRegisterInput;

const sixDigitCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code from your email.");

export const verifyEmailCodeSchema = z.object({
  email: emailField,
  token: sixDigitCode,
});

export type VerifyEmailCodeInput = z.infer<typeof verifyEmailCodeSchema>;

export const resendCodeSchema = z.object({
  email: emailField,
});

export type ResendCodeInput = z.infer<typeof resendCodeSchema>;

export const recoveryRequestSchema = z.object({
  email: emailField,
});

export type RecoveryRequestInput = z.infer<typeof recoveryRequestSchema>;

export const recoveryConfirmSchema = z
  .object({
    email: emailField,
    token: sixDigitCode,
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "Confirm your new password.").max(128),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RecoveryConfirmInput = z.infer<typeof recoveryConfirmSchema>;
