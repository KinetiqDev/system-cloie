/**
 * validate-demo-target-isolation.ts
 *
 * Pre-flight check before demo data reset/provisioning. Validates that the
 * configured environment is NOT the primary public Production deployment and
 * that the dedicated demo configuration is self-consistent.
 *
 * Run before `pnpm db:seed` or `pnpm db:push` on the demo target:
 *   tsx scripts/validate-demo-target-isolation.ts
 *
 * Environment variables checked:
 *  - CLOIE_DEPLOYMENT_KIND     Must be "dedicated-demo".
 *  - CLOIE_DEMO_ENABLED        Must be "true".
 *  - CLOIE_DEMO_SESSION_SECRET Must be present and at least 32 chars.
 *  - CLOIE_DEMO_ALLOWED_USERS  Must be non-empty.
 *  - CLOIE_BACKEND_ID          Explicit identity of the running backend;
 *                              must equal the dedicated demo identity.
 *  - CLOIE_DEMO_BACKEND_ID     Explicit identity of the dedicated demo backend.
 *  - CLOIE_PRIMARY_BACKEND_ID  Explicit identity of the primary Production backend.
 *  - CLOIE_DEMO_DATABASE_ID    Opaque identity persisted on the demo database.
 *  - NEXT_PUBLIC_SUPABASE_URL, DATABASE_URL, DIRECT_URL
 *                            Must be present so the destructive reset can be
 *                            bound to positive target evidence (the
 *                            target-persisted marker verified by the reset
 *                            script). No hostname heuristics are used.
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Backend identities are opaque operator-assigned identifiers. The restricted
 * charset keeps them embeddable in SQL literals and log output without
 * quoting concerns, and forbids whitespace and quote characters outright.
 */
const BACKEND_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function isValidBackendId(value: string | undefined): value is string {
  return !!value && BACKEND_ID_PATTERN.test(value);
}

function validateBackendIdentity(
  env: Record<string, string | undefined>,
  errors: string[]
): {
  backendId: string | undefined;
  demoBackendId: string | undefined;
  primaryBackendId: string | undefined;
} {
  const backendId = env.CLOIE_BACKEND_ID;
  const demoBackendId = env.CLOIE_DEMO_BACKEND_ID;
  const primaryBackendId = env.CLOIE_PRIMARY_BACKEND_ID;

  if (!isValidBackendId(backendId)) {
    errors.push(
      "CLOIE_BACKEND_ID must identify the running backend (non-empty, no whitespace, characters [A-Za-z0-9._-])."
    );
  }
  if (!isValidBackendId(demoBackendId)) {
    errors.push(
      "CLOIE_DEMO_BACKEND_ID must identify the dedicated demo backend (non-empty, no whitespace, characters [A-Za-z0-9._-])."
    );
  }
  if (!isValidBackendId(primaryBackendId)) {
    errors.push(
      "CLOIE_PRIMARY_BACKEND_ID must identify the primary Production backend (non-empty, no whitespace, characters [A-Za-z0-9._-])."
    );
  }

  if (
    isValidBackendId(backendId) &&
    isValidBackendId(demoBackendId) &&
    backendId !== demoBackendId
  ) {
    errors.push(
      `CLOIE_BACKEND_ID is "${backendId}"; expected the dedicated demo backend identity "${demoBackendId}".`
    );
  }
  if (
    isValidBackendId(demoBackendId) &&
    isValidBackendId(primaryBackendId) &&
    demoBackendId === primaryBackendId
  ) {
    errors.push("The dedicated demo and primary Production backend identities must differ.");
  }

  return { backendId, demoBackendId, primaryBackendId };
}

function validateUrlEvidence(env: Record<string, string | undefined>, errors: string[]): void {
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "DATABASE_URL", "DIRECT_URL"] as const) {
    const value = env[name];
    if (!value) {
      errors.push(`${name} must be present so the demo reset can verify positive target evidence.`);
      continue;
    }
    try {
      new URL(value);
    } catch {
      errors.push(`${name} is not a valid URL.`);
    }
  }
}

function validateDatabaseIdentity(env: Record<string, string | undefined>, errors: string[]): void {
  if (!isValidBackendId(env.CLOIE_DEMO_DATABASE_ID)) {
    errors.push(
      "CLOIE_DEMO_DATABASE_ID must identify the dedicated demo database (non-empty, no whitespace, characters [A-Za-z0-9._-])."
    );
  }
}

export function validateDemoTargetIsolation(
  env: Record<string, string | undefined> = process.env
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Deployment kind must identify the dedicated demo ───────────────────
  if (env.CLOIE_DEPLOYMENT_KIND !== "dedicated-demo") {
    errors.push(
      `CLOIE_DEPLOYMENT_KIND is "${env.CLOIE_DEPLOYMENT_KIND ?? "<unset>"}"; expected "dedicated-demo".`
    );
  }

  // ── Demo must be explicitly enabled ────────────────────────────────────
  if (env.CLOIE_DEMO_ENABLED !== "true") {
    errors.push(`CLOIE_DEMO_ENABLED is "${env.CLOIE_DEMO_ENABLED ?? "<unset>"}"; expected "true".`);
  }

  // ── Session secret must be present and strong ──────────────────────────
  const secret = env.CLOIE_DEMO_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    errors.push("CLOIE_DEMO_SESSION_SECRET must be at least 32 characters.");
  }

  // ── Allowlist must be non-empty ────────────────────────────────────────
  const allowedUsers = env.CLOIE_DEMO_ALLOWED_USERS?.trim();
  if (!allowedUsers) {
    errors.push("CLOIE_DEMO_ALLOWED_USERS must be a non-empty value.");
  }

  // ── Confirm the primary Production deployment check ────────────────────
  if (env.NODE_ENV !== "production") {
    errors.push(
      `NODE_ENV is "${env.NODE_ENV ?? "<unset>"}"; expected "production" for a production-mode demo deployment.`
    );
  }

  // The demo target must be positively identified by explicit backend
  // identity rather than inferred from URL names. The reset also compares an
  // operator-assigned database identity with a marker stored on that database.
  validateBackendIdentity(env, errors);
  validateDatabaseIdentity(env, errors);
  validateUrlEvidence(env, errors);

  return { valid: errors.length === 0, errors, warnings };
}

function main(): void {
  const result = validateDemoTargetIsolation();

  for (const warning of result.warnings) {
    console.warn(`⚠  ${warning}`);
  }

  for (const error of result.errors) {
    console.error(`✖  ${error}`);
  }

  if (result.valid) {
    console.log("\n✓ Demo target isolation validated. Proceed with reset/provisioning.");
    process.exit(0);
  } else {
    console.error(
      `\n✖ Demo target isolation FAILED (${result.errors.length} error(s)). Do not proceed.`
    );
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("validate-demo-target-isolation.ts")) {
  main();
}
