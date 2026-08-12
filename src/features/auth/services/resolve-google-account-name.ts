/**
 * Server-side Google provider account-name resolver (ADR 0014).
 *
 * Used only by real Supabase Google OAuth callbacks. Development and
 * dedicated-demo authentication must not invoke this module.
 *
 * Precedence: `name` → `full_name` → complete `given_name` + `family_name`.
 * Never derives a name from email and never invents placeholders.
 */

type GoogleAccountNameResolution =
  | { ok: true; name: string }
  | { ok: false; reason: "missing-name" };

function readTrimmedClaim(metadata: Record<string, unknown>, key: string): string {
  const value = metadata[key];
  if (typeof value !== "string") {
    return "";
  }
  // Outer whitespace only — preserve internal spacing, casing, punctuation, diacritics.
  return value.trim();
}

/**
 * Resolves the canonical opaque account name from authenticated Google
 * `user_metadata`. Returns a typed missing-name result when no usable
 * complete provider name is present.
 */
export function resolveGoogleAccountName(
  metadata: Record<string, unknown> | null | undefined
): GoogleAccountNameResolution {
  const meta = metadata ?? {};

  const displayName = readTrimmedClaim(meta, "name");
  if (displayName) {
    return { ok: true, name: displayName };
  }

  const fullName = readTrimmedClaim(meta, "full_name");
  if (fullName) {
    return { ok: true, name: fullName };
  }

  const givenName = readTrimmedClaim(meta, "given_name");
  const familyName = readTrimmedClaim(meta, "family_name");
  if (givenName && familyName) {
    return { ok: true, name: `${givenName} ${familyName}` };
  }

  return { ok: false, reason: "missing-name" };
}
