import { cookies } from "next/headers";
import type { SystemRole } from "@prisma/client";
import { externalEmailContinueSchema, externalRoleSchema } from "@/lib/schemas/external-entry";

/**
 * Carries what a person chose at external registration across the verification
 * step: the address the code went to, and the external role they asked for.
 *
 * Why cookies: the address is personal data, and a query parameter would put it
 * in the address bar, browser history, `Referer` headers, and proxy logs. The
 * role travels alongside it because it is the other half of the same pending
 * request — the step that resolves the code is the step that has to know which
 * onboarding the verified account is entering.
 *
 * Both values are the requester's own submitted input, re-displayed to that
 * same browser. Neither is trusted for authorization: the role is re-validated
 * against the external self-service set and the address is re-validated and
 * re-normalized by every Server Action that acts on it.
 *
 * Scope: `Path=/verify-email` so the values never travel to any other route,
 * `httpOnly` so script cannot read them, and a fixed lifetime rather than a
 * session cookie, because the person has to reach their inbox first.
 */
const PENDING_VERIFICATION_EMAIL_COOKIE = "cloie_pending_verify_email";
const PENDING_VERIFICATION_ROLE_COOKIE = "cloie_pending_external_role";

/**
 * Matches the configured signup-code lifetime. Expiry drops the convenience
 * pin; verification still depends on the provider accepting the code.
 */
const PENDING_VERIFICATION_MAX_AGE_SECONDS = 60 * 60;

export const VERIFY_EMAIL_PATH = "/verify-email";

/**
 * Enumeration-neutral notice for the code step. Registration returns this for
 * every accepted address — including a duplicate that was silently absorbed —
 * so the copy must stay identical whether or not mail was actually sent.
 */
export const PENDING_VERIFICATION_NOTICE =
  "If this email is eligible, a 6-digit verification code is on its way. Enter it to continue.";

function cookieOptions() {
  return {
    httpOnly: true,
    maxAge: PENDING_VERIFICATION_MAX_AGE_SECONDS,
    path: VERIFY_EMAIL_PATH,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV !== "development",
  };
}

/** Reads the pinned address for the code step; null when there is none. */
export async function readPendingVerificationEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(PENDING_VERIFICATION_EMAIL_COOKIE)?.value;
    if (!value) return null;
    // Normalizes to the same form the Server Actions submit.
    const parsed = externalEmailContinueSchema.safeParse({ email: value.trim() });
    return parsed.success ? parsed.data.email : null;
  } catch {
    return null;
  }
}

/**
 * Reads the external role only for the address that registration pinned.
 * Another registration in the same browser must not retarget a verified
 * account to that registration's role.
 */
export async function readPendingExternalRole(email: string): Promise<SystemRole | null> {
  try {
    const cookieStore = await cookies();
    const pinnedEmail = cookieStore.get(PENDING_VERIFICATION_EMAIL_COOKIE)?.value;
    const parsedEmail = externalEmailContinueSchema.safeParse({ email: pinnedEmail?.trim() });
    if (
      !parsedEmail.success ||
      parsedEmail.data.email.toLowerCase() !== email.trim().toLowerCase()
    ) {
      return null;
    }
    const value = cookieStore.get(PENDING_VERIFICATION_ROLE_COOKIE)?.value;
    if (!value) return null;
    const parsed = externalRoleSchema.safeParse(value.trim().toUpperCase());
    return parsed.success ? (parsed.data as SystemRole) : null;
  } catch {
    return null;
  }
}

/** Pins what registration just accepted. Best effort by design. */
export async function rememberPendingExternalRegistration(input: {
  email: string;
  role: SystemRole;
}): Promise<void> {
  const parsed = externalEmailContinueSchema.safeParse({ email: input.email.trim() });
  if (!parsed.success) return;
  try {
    const cookieStore = await cookies();
    cookieStore.set(PENDING_VERIFICATION_EMAIL_COOKIE, parsed.data.email, cookieOptions());
    cookieStore.set(PENDING_VERIFICATION_ROLE_COOKIE, input.role, cookieOptions());
  } catch {
    // The pin is a convenience, not a gate: without it the code step falls
    // back to an editable address field, so registration stays accepted.
  }
}

/**
 * Clears the pins once the code verifies, so the code step stops showing an
 * address the person has already finished with. Uses `set` with a zero maxAge
 * rather than `delete` because the cookies are path-scoped and `delete` resets
 * the path to `/`, which would leave the originals in place.
 */
export async function clearPendingExternalRegistration(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_VERIFICATION_EMAIL_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  cookieStore.set(PENDING_VERIFICATION_ROLE_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}
