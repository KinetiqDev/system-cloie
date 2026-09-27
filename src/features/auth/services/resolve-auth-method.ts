import type { User } from "@supabase/supabase-js";

/**
 * The sign-in method proved for the current System CLOIE session.
 *
 * `google` is the only method that satisfies an internal role (issue #649).
 * `password` covers credential sign-in; `otp` covers a six-digit email
 * confirmation code; `recovery` covers a password-recovery session, which is
 * confined to the credential change and never carries workspace authority.
 */
export type AuthMethod = "google" | "password" | "otp" | "recovery";

type SessionKind = "oauth" | "dev" | "dedicated-demo" | "ci-test";

const GOOGLE_PROVIDER = "google";
const EMAIL_PROVIDER = "email";

/**
 * Supabase reports the method of the *current* session in the signed access
 * token's `amr` claim. It is the only source of truth that distinguishes a
 * Google sign-in from a password, one-time-code, or recovery session on the
 * same Auth identity, so the verified JWT is the only input this trusts.
 */
export function resolveAuthMethodFromClaims(claims: unknown): AuthMethod | null {
  if (!claims || typeof claims !== "object" || !("amr" in claims)) return null;
  const amr = claims.amr;
  if (!Array.isArray(amr) || amr.length === 0) return null;

  const methods = amr
    .map((entry) => {
      if (!entry || typeof entry !== "object" || !("method" in entry)) return "";
      const method = entry.method;
      return typeof method === "string" ? method.trim().toLowerCase() : "";
    })
    .filter((method) => method.length > 0);

  if (methods.length === 0) return null;
  // Google wins when the session was established with it; otherwise the
  // strongest non-Google method present decides.
  if (methods.includes(GOOGLE_PROVIDER)) return "google";
  if (methods.includes("otp")) return "otp";
  if (methods.includes("recovery")) return "recovery";
  if (methods.includes("password") || methods.includes(EMAIL_PROVIDER)) return "password";
  return null;
}

/**
 * The non-Google development, dedicated-demo, and CI-test sessions are not
 * Supabase sessions and carry no `amr` claim. They authenticate fixture
 * accounts, so they resolve to `google` and stay bounded by their own
 * deployment gates; only a real Supabase session can resolve to password, OTP,
 * or recovery.
 */
export function resolveAuthMethodForSession(mode: SessionKind, claims: unknown): AuthMethod | null {
  if (mode !== "oauth") return "google";
  return resolveAuthMethodFromClaims(claims);
}

/**
 * Reads the verified access-token claims for the current session. `getClaims`
 * validates the JWT against the Auth server rather than trusting the cookie, so
 * a forged `amr` claim cannot open an internal role.
 */
export async function resolveSessionAuthMethod(
  getClaims: () => Promise<{ data: { claims?: unknown } | null; error: unknown }>
): Promise<AuthMethod | null> {
  try {
    const { data, error } = await getClaims();
    if (error || !data) return null;
    return resolveAuthMethodFromClaims(data.claims);
  } catch {
    return null;
  }
}

/**
 * The Auth identity's linked providers, used only to detect that a
 * password-created identity already has a federated identity before System
 * CLOIE links it to a domain account. Not an authorization input.
 */
export function linkedProviderNames(user: Pick<User, "identities"> | null): string[] {
  const identities = user?.identities;
  if (!Array.isArray(identities)) return [];
  return identities
    .map((identity) => (typeof identity?.provider === "string" ? identity.provider : ""))
    .map((provider) => provider.trim().toLowerCase())
    .filter((provider) => provider.length > 0);
}
