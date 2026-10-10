import type { User } from "@supabase/supabase-js";

/**
 * The sign-in method proved for the current System CLOIE session.
 *
 * `google` is the only method that satisfies an internal role (issue #649).
 * `password` covers credential sign-in. GoTrue emits `otp` for both signup
 * and recovery codes, so raw OTP sessions carry no workspace authority.
 * `verified-signup` requires the application's signed, session-bound proof
 * that the strict signup-code action accepted this session.
 */
export type AuthMethod = "google" | "password" | "verified-signup" | "otp" | "recovery";

type SessionKind = "oauth" | "dev" | "dedicated-demo" | "ci-test";

/**
 * GoTrue reports every OAuth provider sign-in as the single method `oauth`
 * (see the AMR method list in @supabase/auth-js and the Supabase JWT claims
 * reference). The `amr` claim therefore proves *that* the current session came
 * from an OAuth provider, never *which* one. Nor is the provider field
 * session-scoped: `app_metadata.provider` is the identity's first-created
 * provider and `app_metadata.providers` is the full linked set, so neither
 * names the provider that opened the current session.
 */
const AMR_OAUTH = "oauth";
const AMR_PASSWORD = "password";
const AMR_OTP = "otp";
const AMR_RECOVERY = "recovery";
const EMAIL_PROVIDER = "email";

/**
 * System CLOIE enables exactly one OAuth provider (Google) on every target —
 * see `[auth.external.google]` in supabase/config.toml, where every other
 * external provider is disabled. Under that invariant, `amr: oauth` plus a
 * linked provider set containing Google is a Google session.
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
 * Whether the identity's server-managed linked provider set contains Google.
 * `app_metadata.providers` is written by GoTrue; nothing user-editable is read.
 */
function hasGoogleLinkedProvider(claims: unknown): boolean {
  const appMetadata =
    claims && typeof claims === "object" && "app_metadata" in claims ? claims.app_metadata : null;
  const linkedProviders =
    appMetadata && typeof appMetadata === "object" && "providers" in appMetadata
      ? appMetadata.providers
      : null;
  return (
    Array.isArray(linkedProviders) &&
    linkedProviders.some(
      (provider) =>
        typeof provider === "string" && provider.trim().toLowerCase() === GOOGLE_PROVIDER
    )
  );
}

/**
 * Resolves the current session's authentication method from verified access
 * token claims only.
 *
 * An OAuth session is accepted as `google` only when the identity's linked
 * provider set contains Google; a provider set without Google, a missing
 * claim, or any claim shape GoTrue never emits resolves to null, which the
 * profile gate treats as unproved and refuses for every internal role.
 * `user_metadata` is never consulted: it is user-editable.
 *
 * The linked set is read from the server-managed `app_metadata.providers`
 * list, never from `app_metadata.provider`: that field is not session-scoped,
 * and GoTrue sets it to the first-created identity's provider and never
 * advances it, so a password-first identity that later links Google keeps
 * `provider: email` while `providers` carries the Google link.
 */
export function resolveAuthMethodFromClaims(claims: unknown): AuthMethod | null {
  const methods = readAmrMethods(claims);
  if (methods.length === 0) return null;

  // A proved credential method outranks OAuth: when a claim carries both, the
  // password, one-time-code, or recovery step is what actually established
  // this session, so the session must not be trusted as a Google sign-in.
  if (methods.includes(AMR_RECOVERY)) return "recovery";
  if (methods.includes(AMR_OTP)) return "otp";
  if (methods.includes(AMR_PASSWORD) || methods.includes(EMAIL_PROVIDER)) return "password";

  if (methods.includes(AMR_OAUTH)) {
    return methods.every((method) => method === AMR_OAUTH) && hasGoogleLinkedProvider(claims)
      ? "google"
      : null;
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

/** The verified Auth identity shape the entry flow links a domain account to. */
export type VerifiedAuthIdentity = Pick<User, "id" | "email" | "user_metadata" | "identities">;

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
