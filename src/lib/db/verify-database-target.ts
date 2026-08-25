import {
  getProjectRefFromDatabaseUrl,
  getProjectRefFromSupabaseUrl,
} from "../supabase/project-identity";

export type DatabaseTargetValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

const DISPOSABLE_HOST_ALLOWLIST: Record<string, true> = {
  localhost: true,
  "127.0.0.1": true,
  "::1": true,
  postgres: true,
  db: true,
  "0.0.0.0": true,
  "host.docker.internal": true,
};

function parseHostname(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function isHostedSupabaseHostname(hostname: string): boolean {
  return (
    hostname.endsWith(".supabase.co") ||
    hostname.endsWith(".pooler.supabase.com") ||
    hostname.includes("supabase.co")
  );
}

export function verifyDisposableDatabaseTarget(
  env: Record<string, string | undefined> = process.env
): DatabaseTargetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const databaseUrl = env.DATABASE_URL?.trim();
  const directUrl = env.DIRECT_URL?.trim();
  const supabaseUrl =
    env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? env.SUPABASE_URL?.trim();

  // DATABASE_URL is required for any mutation.
  if (!databaseUrl) {
    errors.push("DATABASE_URL is required for database verification.");
    return { valid: false, errors, warnings };
  }

  const databaseHostname = parseHostname(databaseUrl);
  if (!databaseHostname) {
    errors.push(
      `DATABASE_URL is not a valid URL: "${databaseUrl.slice(0, 64)}".`
    );
  } else if (isHostedSupabaseHostname(databaseHostname)) {
    errors.push(
      `DATABASE_URL hostname "${databaseHostname}" looks like a hosted Supabase target — refusing to run against hosted Supabase. Use a disposable Postgres service (e.g. localhost:5432).`
    );
  }

  // Reject any Supabase-hosted identity extracted via project ref helpers.
  const databaseProjectRef = getProjectRefFromDatabaseUrl(databaseUrl);
  if (databaseProjectRef) {
    errors.push(
      `DATABASE_URL resolves to hosted Supabase project "${databaseProjectRef}" — refusing to run against hosted Supabase. Use a disposable Postgres target.`
    );
  }

  if (directUrl) {
    const directHostname = parseHostname(directUrl);
    if (directHostname && isHostedSupabaseHostname(directHostname)) {
      errors.push(
        `DIRECT_URL hostname "${directHostname}" looks like a hosted Supabase target — refusing to run against hosted Supabase.`
      );
    }
    const directRef = getProjectRefFromDatabaseUrl(directUrl);
    if (directRef) {
      errors.push(
        `DIRECT_URL resolves to hosted Supabase project "${directRef}" — refusing to run against hosted Supabase.`
      );
    }
  }

  if (supabaseUrl) {
    const supabaseHostname = parseHostname(supabaseUrl);
    if (supabaseHostname && isHostedSupabaseHostname(supabaseHostname)) {
      // localhost supabase URL is allowed (e.g. http://localhost:54321 in CI)
      // but any *.supabase.co is rejected for the disposable database command.
      errors.push(
        `NEXT_PUBLIC_SUPABASE_URL hostname "${supabaseHostname}" looks like a hosted Supabase target — disposable database verification must not point at hosted Supabase.`
      );
    }
    const supabaseRef = getProjectRefFromSupabaseUrl(supabaseUrl);
    if (supabaseRef) {
      errors.push(
        `NEXT_PUBLIC_SUPABASE_URL resolves to hosted Supabase project "${supabaseRef}" — refusing to run against hosted Supabase.`
      );
    }
  }

  // Explicitly disposable target: hostname must be in allowlist.
  if (databaseHostname && !DISPOSABLE_HOST_ALLOWLIST[databaseHostname]) {
    errors.push(
      `DATABASE_URL must target a disposable database (allowed hosts: ${Object.keys(DISPOSABLE_HOST_ALLOWLIST).join(", ")}); got "${databaseHostname}". Set DATABASE_URL to the disposable Postgres service (e.g. postgresql://postgres:postgres@localhost:5432/cloie_test).`
    );
  }

  // Also guard common hosted-supabase env leakage: Supabase project refs set
  // in the environment imply a hosted target was configured.
  if (env.SUPABASE_PROJECT_REF || env.CLOIE_DEMO_SUPABASE_PROJECT_REF) {
    // These are not strictly hosted DB URLs, but their presence alongside a
    // non-disposable DATABASE_URL would be suspicious. We don't error here
    // unless the URL itself was already flagged; this is a soft warning path
    // for future tightening. Currently no-op to avoid false positives in demo.
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function assertDisposableDatabaseTarget(
  env: Record<string, string | undefined> = process.env
): void {
  const result = verifyDisposableDatabaseTarget(env);
  if (!result.valid) {
    throw new Error(
      `Disposable database target validation FAILED:\n${result.errors.join("\n")}`
    );
  }
}
