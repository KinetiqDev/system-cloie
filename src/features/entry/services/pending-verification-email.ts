import { cookies } from "next/headers";
import { externalEmailContinueSchema } from "@/lib/schemas/external-entry";

/**
 * Pins the address a person just registered with, so `/verify-email` can show
 * it read-only instead of asking for it again.
 *
 * Why a cookie: the address is personal data, and a query parameter would put
 * it in the address bar, browser history, `Referer` headers, and proxy logs.
 * The value is the requester's own submitted address, re-displayed to that
 * same browser — it is never trusted for authorization, and every Server
 * Action re-validates and re-normalizes the address it acts on.
 *
 * Scope: `Path=/verify-email` so the value never travels to any other route,
 * `httpOnly` so script cannot read it, and a fixed lifetime rather than a
 * session cookie, because the person has to reach their inbox first.
 */
export const PENDING_VERIFICATION_EMAIL_COOKIE = "cloie_pending_verify_email";

/**
 * Matches the provider's signup-code lifetime. A longer pin would show an
 * address whose code can no longer arrive; a shorter one would drop the pin
 * while the code is still valid.
 */
export const PENDING_VERIFICATION_MAX_AGE_SECONDS = 60 * 60;

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

/** Normalizes to the same form the Server Actions submit, or null if unusable. */
function toPendingEmail(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = externalEmailContinueSchema.safeParse({ email: value.trim() });
  return parsed.success ? parsed.data.email : null;
}

/** Reads the pinned address for the code step; null when there is none. */
export async function readPendingVerificationEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return toPendingEmail(cookieStore.get(PENDING_VERIFICATION_EMAIL_COOKIE)?.value);
  } catch {
    return null;
  }
}

/** Pins the address that registration just accepted. Best effort by design. */
export async function rememberPendingVerificationEmail(email: string): Promise<void> {
  const normalized = toPendingEmail(email);
  if (!normalized) return;
  try {
    const cookieStore = await cookies();
    cookieStore.set(PENDING_VERIFICATION_EMAIL_COOKIE, normalized, cookieOptions());
  } catch {
    // The pin is a convenience, not a gate: without it the code step falls
    // back to an editable address field, so registration stays accepted.
  }
}

/**
 * Clears the pin once the code verifies, so the code step stops showing an
 * address the person has already finished with. Uses `set` with a zero maxAge
 * rather than `delete` because the cookie is path-scoped and `delete` resets
 * the path to `/`, which would leave the original in place.
 */
export async function clearPendingVerificationEmail(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_VERIFICATION_EMAIL_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}
