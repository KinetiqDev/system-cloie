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

/**
 * GoTrue reports every OAuth provider sign-in as the single method `oauth`
 * (see the AMR method list in @supabase/auth-js and the Supabase JWT claims
 * reference). The `amr` claim therefore proves *that* the current session came
 * from an OAuth provider, never *which* one. The provider is only available in
 * `app_metadata.provider`, which is not session-scoped: a password identity that
 * once signed in through Google keeps that provider value forever.
 */
const AMR_OAUTH = "oauth";
const AMR_PASSWORD = "password";
const AMR_OTP = "otp";
const AMR_RECOVERY = "recovery";
const EMAIL_PROVIDER = "email";

/**
 * System CLOIE enables exactly one OAuth provider (Google) on every target —
 * see `[auth.external.google]` in supabase/config.toml, where every other
 * external provider is disabled. Under that invariant, an `oauth` session whose
 * verified `app_metadata.provider` is `google` is a Google session.
 */
const GOOGLE_PROVIDER = "google";

function readAmrMethods(claims: unknown): string[] {
  if (!claims || typeof claims !== "object" || !("amr" in claims)) return [];
  const amr = claims.amr;
  if (!Array.isArray(amr)) return [];

  return amr
    .map((entry) => {
      if (!entry || typeof entry !== "object" || !("method" in entry)) return "";
      const method = entry.method;
      return typeof method === "string" ? method.trim().toLowerCase() : "";
    })
    .filter((method) => method.length > 0);
}

/**
 * The provider GoTrue recorded for the Auth identity. It is only trustworthy
 * as corroboration for an `oauth` session: it is server-managed, and it is not
 * session-scoped, so it can never on its own prove how the current session was
 * established.
 */
function readRecordedProvider(claims: unknown): string | null {
  if (!claims || typeof claims !== "object" || !("app_metadata" in claims)) return null;
  const appMetadata = claims.app_metadata;
  if (!appMetadata || typeof appMetadata !== "object" || !("provider" in appMetadata)) {
    return null;
  }
  const provider = appMetadata.provider;
  return typeof provider === "string" ? provider.trim().toLowerCase() : null;
}

/**
 * Resolves the current session's authentication method from verified access
 * token claims only.
 *
 * An OAuth session is accepted as `google` only when the recorded provider is
 * Google; any other provider, an unrecorded provider, or a missing claim
 * resolves to null, which the profile gate treats as unproved and refuses for
 * every internal role. `user_metadata` is never consulted: it is user-editable.
 */
export function resolveAuthMethodFromClaims(claims: unknown): AuthMethod | null {
  const methods = readAmrMethods(claims);
  if (methods.length === 0) return null;

  // A proved credential method outranks OAuth: when a claim carries both, the
  // password, one-time-code, or recovery step is what actually established
  // this session, so the session must not be trusted as a Google sign-in.
  if (methods.includes(AMR_PASSWORD) || methods.includes(EMAIL_PROVIDER)) return "password";
  if (methods.includes(AMR_OTP)) return "otp";
  if (methods.includes(AMR_RECOVERY)) return "recovery";

  if (methods.includes(AMR_OAUTH)) {
    return readRecordedProvider(claims) === GOOGLE_PROVIDER ? "google" : null;
  }
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
 * a forged `amr` claim can never open an internal role.
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
