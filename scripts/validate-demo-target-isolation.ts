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
 *  - CLOIE_DEMO_SUPABASE_PROJECT_REF
 *                            Explicit identity of the dedicated demo project.
 *  - CLOIE_PRIMARY_SUPABASE_PROJECT_REF
 *                            Explicit identity of the primary Production project.
 *  - SUPABASE_PROJECT_REF, NEXT_PUBLIC_SUPABASE_URL, DATABASE_URL, DIRECT_URL
 *                            Must all resolve to the dedicated demo project.
 */

import { loadEnvConfig } from "@next/env";
import {
  getProjectRefFromDatabaseUrl,
  getProjectRefFromSupabaseUrl,
} from "../src/lib/supabase/project-identity";

loadEnvConfig(process.cwd());

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

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

  // The reset target must be positively identified rather than inferred from
  // a URL name, because Supabase project references are opaque identifiers.
  const demoProjectRef = env.CLOIE_DEMO_SUPABASE_PROJECT_REF;
  const primaryProjectRef = env.CLOIE_PRIMARY_SUPABASE_PROJECT_REF;
  if (!demoProjectRef) {
    errors.push("CLOIE_DEMO_SUPABASE_PROJECT_REF must identify the dedicated demo project.");
  }
  if (!primaryProjectRef) {
    errors.push("CLOIE_PRIMARY_SUPABASE_PROJECT_REF must identify the primary Production project.");
  }
  if (demoProjectRef && primaryProjectRef && demoProjectRef === primaryProjectRef) {
    errors.push("The dedicated demo and primary Production project references must differ.");
  }

  const targetRefs = [
    ["SUPABASE_PROJECT_REF", env.SUPABASE_PROJECT_REF],
    ["NEXT_PUBLIC_SUPABASE_URL", getProjectRefFromSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL)],
    ["DATABASE_URL", getProjectRefFromDatabaseUrl(env.DATABASE_URL)],
    ["DIRECT_URL", getProjectRefFromDatabaseUrl(env.DIRECT_URL)],
  ] as const;

  for (const [source, projectRef] of targetRefs) {
    if (!projectRef) {
      errors.push(`${source} must identify the configured dedicated demo project.`);
    } else if (demoProjectRef && projectRef !== demoProjectRef) {
      errors.push(`${source} does not identify the configured dedicated demo project.`);
    }
    if (primaryProjectRef && projectRef === primaryProjectRef) {
      errors.push(`${source} identifies the primary Production project.`);
    }
  }

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
