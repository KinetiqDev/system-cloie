// fallow-ignore-next-line unused-type
export type DatabaseTargetValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

const DISPOSABLE_HOST_ALLOWLIST: Record<string, true> = {
  localhost: true,
  "127.0.0.1": true,
  "::1": true,
  "[::1]": true,
  postgres: true,
  db: true,
  "0.0.0.0": true,
  "host.docker.internal": true,
};

function parseHostname(value: string): string | null {
  try {
    const raw = new URL(value).hostname;
    // WHATWG URL returns "[::1]" with brackets for IPv6 literals; normalize to "::1" as well as keep bracket form in allowlist.
    if (raw.startsWith("[") && raw.endsWith("]")) return raw.slice(1, -1);
    return raw;
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

function collectDatabaseUrlErrors(databaseUrl: string, errors: string[]): string | null {
  const hostname = parseHostname(databaseUrl);
  if (!hostname) {
    errors.push("DATABASE_URL is not a valid URL.");
    return null;
  }
  if (isHostedSupabaseHostname(hostname)) {
    errors.push(
      `DATABASE_URL hostname "${hostname}" looks like a hosted Supabase target — refusing to run against hosted Supabase. Use a disposable Postgres service (e.g. localhost:5432).`
    );
  }
  return hostname;
}

function collectDirectUrlErrors(directUrl: string | undefined, errors: string[]): void {
  if (!directUrl) return;
  const hostname = parseHostname(directUrl);
  if (hostname && isHostedSupabaseHostname(hostname)) {
    errors.push(
      `DIRECT_URL hostname "${hostname}" looks like a hosted Supabase target — refusing to run against hosted Supabase.`
    );
  }
}

function collectSupabaseUrlErrors(supabaseUrl: string | undefined, errors: string[]): void {
  if (!supabaseUrl) return;
  const hostname = parseHostname(supabaseUrl);
  if (hostname && isHostedSupabaseHostname(hostname)) {
    errors.push(
      `NEXT_PUBLIC_SUPABASE_URL hostname "${hostname}" looks like a hosted Supabase target — disposable database verification must not point at hosted Supabase.`
    );
  }
}

function collectDisposableHostError(hostname: string | null, errors: string[]): void {
  if (hostname && !DISPOSABLE_HOST_ALLOWLIST[hostname]) {
    errors.push(
      `DATABASE_URL must target a disposable database (allowed hosts: ${Object.keys(DISPOSABLE_HOST_ALLOWLIST).join(", ")}); got "${hostname}". Set DATABASE_URL to the disposable Postgres service (e.g. postgresql://postgres:postgres@localhost:5432/cloie_test).`
    );
  }
}

export function verifyDisposableDatabaseTarget(
  env: Record<string, string | undefined> = process.env
): DatabaseTargetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const databaseUrl = env.DATABASE_URL?.trim();
  const directUrl = env.DIRECT_URL?.trim();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? env.SUPABASE_URL?.trim();

  if (!databaseUrl) {
    errors.push("DATABASE_URL is required for database verification.");
    return { valid: false, errors, warnings };
  }

  const hostname = collectDatabaseUrlErrors(databaseUrl, errors);
  collectDirectUrlErrors(directUrl, errors);
  collectSupabaseUrlErrors(supabaseUrl, errors);
  collectDisposableHostError(hostname, errors);

  return { valid: errors.length === 0, errors, warnings };
}

// fallow-ignore-next-line unused-export
export function assertDisposableDatabaseTarget(
  env: Record<string, string | undefined> = process.env
): void {
  const result = verifyDisposableDatabaseTarget(env);
  if (!result.valid) {
    throw new Error(`Disposable database target validation FAILED:\n${result.errors.join("\n")}`);
  }
}
