"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/utils/site-url";
import { requireLegalAcknowledgement } from "@/features/legal/services/require-legal-acknowledgement";
import {
  clearPendingVerificationEmail,
  rememberPendingVerificationEmail,
  VERIFY_EMAIL_PATH,
} from "@/features/entry/services/pending-verification-email";
import { linkExternalVerifiedIdentity } from "@/features/users/services/link-external-identity";
import { linkedProviderNames } from "@/features/auth/services/resolve-auth-method";
import {
  externalEmailContinueSchema,
  externalRegisterSchema,
  externalSignInSchema,
  recoveryConfirmSchema,
  recoveryRequestSchema,
  resendCodeSchema,
  verifyEmailCodeSchema,
} from "@/lib/schemas/external-entry";

/**
 * `LEGAL_ACKNOWLEDGEMENT_REQUIRED` marks the one failure a client cannot
 * recover from on its own: the acknowledgement ticket is missing or expired,
 * so the only way forward is to tick the box. Every other failure leaves the
 * form actionable as-is.
 */
export type ExternalEntryResult =
  | { success: true; message: string }
  | { success: false; error: string; code?: "LEGAL_ACKNOWLEDGEMENT_REQUIRED" };

/**
 * Public external (Alumni / Industry Partner) email-first entry actions.
 *
 * CONTRACT (issue #649): these actions own Supabase Auth transport plus the
 * verified post-verification domain linkage. Supabase Auth is the credential
 * owner — passwords and codes never touch the application schema, and no
 * password column is added. Every response is enumeration-neutral: the same
 * message is returned whether or not the address exists, which provider it
 * uses, or whether a duplicate signup was silently absorbed.
 *
 * A domain `User` is created or linked only after the address is verified, and
 * never when that address already belongs to a domain account — the canonical
 * name is preserved on first Google link (ADR 0014) and is collected at
 * signup for password accounts, never derived from the email local part.
 */

const NEUTRAL_CONTINUE_MESSAGE =
  "If this email can sign in with a password, continue below. Otherwise choose another option — this message is the same for every address.";

const NEUTRAL_VERIFY_MESSAGE =
  "If the code matches, your email is now verified. Continue to complete your registration.";

const NEUTRAL_RESEND_MESSAGE =
  "If a verification is pending for this email, a new code has been sent. Codes expire after their lifetime; wait for the cooldown before requesting again.";

const NEUTRAL_RECOVERY_MESSAGE =
  "If this email can recover its password, a 6-digit recovery code has been sent. Enter it with a new password to continue.";

const NEUTRAL_RECOVERY_CONFIRM_MESSAGE =
  "If the recovery code matches, your password has been updated. Sign in with your new password.";

const LEGAL_REQUIRED_ERROR = "Accept the current Privacy Notice and Terms of Use to continue.";

/**
 * Resend cooldown and attempt limits. GoTrue applies its own instance rate
 * limits; this in-process guard additionally prevents one browser session from
 * hammering the mailer between them, and it never reveals whether a prior
 * request existed for the address.
 */
const RESEND_COOLDOWN_MS = 60_000;
const VERIFY_ATTEMPT_LIMIT = 10;

const resendCooldownUntil = new Map<string, number>();
const verifyAttempts = new Map<string, { count: number; resetAt: number }>();

function isCoolingDown(key: string, now: number): boolean {
  const until = resendCooldownUntil.get(key);
  if (until === undefined) return false;
  if (until > now) return true;
  resendCooldownUntil.delete(key);
  return false;
}

function consumeVerifyAttempt(key: string, now: number): boolean {
  const existing = verifyAttempts.get(key);
  if (!existing || existing.resetAt <= now) {
    verifyAttempts.set(key, { count: 1, resetAt: now + RESEND_COOLDOWN_MS });
    return true;
  }
  if (existing.count >= VERIFY_ATTEMPT_LIMIT) return false;
  existing.count += 1;
  return true;
}

function normalizedEmailKey(value: string): string {
  return value.trim().toLowerCase();
}

function neutralFailure(message: string): ExternalEntryResult {
  return { success: false, error: message };
}

function neutralSuccess(message: string): ExternalEntryResult {
  return { success: true, message };
}

/** Carries the marker the code step needs to re-open the acknowledgement. */
function legalRequiredFailure(): ExternalEntryResult {
  return { success: false, error: LEGAL_REQUIRED_ERROR, code: "LEGAL_ACKNOWLEDGEMENT_REQUIRED" };
}

/**
 * Email-first Continue: validates transport shape and returns a neutral
 * next-step message. Never reveals account existence or provider.
 */
export async function requestExternalEmailContinue(input: unknown): Promise<ExternalEntryResult> {
  const parsed = externalEmailContinueSchema.safeParse(input);
  if (!parsed.success) {
    return neutralFailure("Enter a valid email address to continue.");
  }
  return neutralSuccess(NEUTRAL_CONTINUE_MESSAGE);
}

/**
 * Password sign-in for an external participant. Provider mismatches and
 * unknown addresses collapse into one neutral response.
 */
export async function signInExternalParticipant(input: unknown): Promise<ExternalEntryResult> {
  const legal = await requireLegalAcknowledgement("external");
  if (!legal.acknowledged) return legalRequiredFailure();

  const parsed = externalSignInSchema.safeParse(input);
  if (!parsed.success) {
    return neutralFailure("Enter your email address and password to sign in.");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) {
      return neutralFailure(
        "Those credentials did not match. Try again, reset your password, or continue with Google."
      );
    }
    return neutralSuccess("Signed in. Continuing to your workspace.");
  } catch {
    return neutralFailure(
      "Sign-in is temporarily unavailable. Try again, reset your password, or continue with Google."
    );
  }
}

/**
 * External registration: collects the canonical account name (never derived
 * from the email address) plus the Alumni / Industry Partner choice, then
 * starts Supabase email verification. Domain linkage waits for verification.
 *
 * On acceptance it pins the address and redirects to the code step, so the
 * person types the code in one continuous flow instead of hunting for a link
 * on the page they just left. The redirect carries the enumeration-neutral
 * promise with it: the notice is identical whether mail went out, a duplicate
 * was absorbed, or the transport threw.
 */
export async function registerExternalAccount(input: unknown): Promise<ExternalEntryResult> {
  const legal = await requireLegalAcknowledgement("external");
  if (!legal.acknowledged) return legalRequiredFailure();

  const parsed = externalRegisterSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return neutralFailure(firstIssue?.message ?? "Check the form and try again.");
  }

  const now = Date.now();
  const emailKey = normalizedEmailKey(parsed.data.email);
  const withinCooldown = isCoolingDown(`register:${emailKey}`, now);

  if (!withinCooldown) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          // app_metadata is Auth-owned; the requested role is carried as user
          // metadata only and is never trusted for authorization.
          data: {
            display_name: parsed.data.name,
            requested_role: parsed.data.role,
          },
          emailRedirectTo: `${getSiteUrl()}${VERIFY_EMAIL_PATH}`,
        },
      });
      // A duplicate signup can return an obfuscated result without sending
      // mail; the outcome to the person is the same either way.
      if (!error) {
        resendCooldownUntil.set(`register:${emailKey}`, now + RESEND_COOLDOWN_MS);
      }
    } catch {
      // Deliberately silent: a transport failure must not read differently
      // from a code that was sent.
    }
  }

  await rememberPendingVerificationEmail(parsed.data.email);
  redirect(VERIFY_EMAIL_PATH);
}

/**
 * Confirms inbox control with a 6-digit code before any domain linkage.
 * The response never implies institutional approval.
 */
export async function verifyExternalCode(input: unknown): Promise<ExternalEntryResult> {
  const legal = await requireLegalAcknowledgement("external");
  if (!legal.acknowledged) return legalRequiredFailure();

  const parsed = verifyEmailCodeSchema.safeParse(input);
  if (!parsed.success) {
    return neutralFailure("Enter your email address and the 6-digit code.");
  }

  const now = Date.now();
  const emailKey = normalizedEmailKey(parsed.data.email);
  if (!consumeVerifyAttempt(`verify:${emailKey}`, now)) {
    return neutralFailure("Too many attempts. Wait for the cooldown, then request a new code.");
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.token,
      type: "email",
    });
    if (error || !data.user) {
      return neutralFailure(
        "That code did not match or has expired. Check the latest email or request a new code."
      );
    }

    // Linkage runs only for a genuinely verified password identity. An account
    // that also carries a federated identity keeps its existing domain record.
    const providers = linkedProviderNames(data.user);
    if (!providers.includes("google")) {
      const metadata = data.user.user_metadata ?? {};
      const collected =
        typeof metadata.display_name === "string" ? metadata.display_name.trim() : "";
      const email = data.user.email ?? parsed.data.email;
      await linkExternalVerifiedIdentity({
        authUserId: data.user.id,
        email,
        name: collected.length > 0 ? collected : null,
      });
    }

    // Inbox control is proven, so the pinned address has served its purpose.
    await clearPendingVerificationEmail();

    return neutralSuccess(NEUTRAL_VERIFY_MESSAGE);
  } catch {
    return neutralFailure("Verification is temporarily unavailable. Try again shortly.");
  }
}

/** Re-sends the verification code with a neutral response and cooldown note. */
export async function resendVerificationCode(input: unknown): Promise<ExternalEntryResult> {
  const legal = await requireLegalAcknowledgement("external");
  if (!legal.acknowledged) return legalRequiredFailure();

  const parsed = resendCodeSchema.safeParse(input);
  if (!parsed.success) {
    return neutralFailure("Enter a valid email address to resend the code.");
  }

  const now = Date.now();
  const emailKey = normalizedEmailKey(parsed.data.email);
  if (isCoolingDown(`register:${emailKey}`, now)) {
    return neutralSuccess(NEUTRAL_RESEND_MESSAGE);
  }

  try {
    const supabase = await createClient();
    await supabase.auth.resend({ type: "signup", email: parsed.data.email });
    resendCooldownUntil.set(`register:${emailKey}`, now + RESEND_COOLDOWN_MS);
    return neutralSuccess(NEUTRAL_RESEND_MESSAGE);
  } catch {
    return neutralSuccess(NEUTRAL_RESEND_MESSAGE);
  }
}

/** Starts password recovery with a neutral response. */
export async function requestPasswordRecovery(input: unknown): Promise<ExternalEntryResult> {
  const legal = await requireLegalAcknowledgement("external");
  if (!legal.acknowledged) return legalRequiredFailure();

  const parsed = recoveryRequestSchema.safeParse(input);
  if (!parsed.success) {
    return neutralFailure("Enter a valid email address to request recovery.");
  }

  const now = Date.now();
  const emailKey = normalizedEmailKey(parsed.data.email);
  if (isCoolingDown(`recovery:${emailKey}`, now)) {
    return neutralSuccess(NEUTRAL_RECOVERY_MESSAGE);
  }

  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${getSiteUrl()}/reset-password`,
    });
    resendCooldownUntil.set(`recovery:${emailKey}`, now + RESEND_COOLDOWN_MS);
    return neutralSuccess(NEUTRAL_RECOVERY_MESSAGE);
  } catch {
    return neutralSuccess(NEUTRAL_RECOVERY_MESSAGE);
  }
}

/**
 * Completes recovery: verifies the 6-digit code, sets the new password, and
 * ends the recovery-confined session so it can never reach a workspace.
 */
export async function confirmPasswordRecovery(input: unknown): Promise<ExternalEntryResult> {
  const legal = await requireLegalAcknowledgement("external");
  if (!legal.acknowledged) return legalRequiredFailure();

  const parsed = recoveryConfirmSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return neutralFailure(firstIssue?.message ?? "Check the form and try again.");
  }

  try {
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.token,
      type: "recovery",
    });
    if (verifyError) {
      return neutralFailure(
        "That recovery code did not match or has expired. Request a new one and try again."
      );
    }

    // Confined to the credential change: no role, profile, or enrollment write
    // is reachable from this session, and the session ends immediately after.
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });
    if (updateError) {
      return neutralFailure("The new password was not accepted. Try again.");
    }

    await supabase.auth.signOut();
    return neutralSuccess(NEUTRAL_RECOVERY_CONFIRM_MESSAGE);
  } catch {
    return neutralFailure("Recovery is temporarily unavailable. Try again shortly.");
  }
}
