import { spawnSync } from "node:child_process";

import { resolveLocalBin } from "../resolve-local-bin";
import { getSupabaseCommand } from "../supabase-cli";

/**
 * Real Supabase Auth + mail-catcher integration gate (issue #649).
 *
 * The signed CI cookie session bypasses GoTrue entirely, so no existing gate
 * can prove password, six-digit code, or recovery behavior. This runner starts
 * the disposable local Supabase stack, reads the endpoints the CLI prints, runs
 * the opt-in suite against them, and always stops the stack afterwards.
 *
 * Target safety: `supabase start` is the local CLI Docker stack by
 * construction. The runner never accepts a remote URL, so a hosted Supabase
 * project can never be named here.
 */

/** Services the auth gate does not exercise; excluded to cut startup time. */
const EXCLUDED_SERVICES = [
  "realtime",
  "storage-api",
  "imgproxy",
  "postgrest",
  "studio",
  "edge-runtime",
  "logflare",
  "vector",
  "supavisor",
];

export type AuthStackEndpoints = {
  apiUrl: string;
  anonKey: string;
  serviceKey: string;
  mailUrl: string;
};

/**
 * The CLI prints a JSON status object after `start`, `status`, and `stop` —
 * single-line for start/stop, pretty-printed for `status -o json`. Scanning
 * for the widest parseable object keeps the endpoint contract with the CLI
 * instead of hardcoding ports and keys.
 */
export function parseStackEndpoints(output: string): AuthStackEndpoints | null {
  const toEndpoints = (parsed: Record<string, unknown>): AuthStackEndpoints | null => {
    const apiUrl = parsed.API_URL;
    const mailUrl = parsed.MAILPIT_URL ?? parsed.INBUCKET_URL;
    const anonKey = parsed.ANON_KEY ?? parsed.PUBLISHABLE_KEY;
    const serviceKey = parsed.SERVICE_ROLE_KEY ?? parsed.SECRET_KEY;
    if (
      typeof apiUrl !== "string" ||
      typeof mailUrl !== "string" ||
      typeof anonKey !== "string" ||
      typeof serviceKey !== "string"
    ) {
      return null;
    }
    return { apiUrl, anonKey, serviceKey, mailUrl };
  };

  for (let start = output.indexOf("{"); start !== -1; start = output.indexOf("{", start + 1)) {
    for (let end = output.indexOf("}", start); end !== -1; end = output.indexOf("}", end + 1)) {
      try {
        const endpoints = toEndpoints(
          JSON.parse(output.slice(start, end + 1)) as Record<string, unknown>
        );
        if (endpoints) return endpoints;
      } catch {
        // Not a complete object yet; widen the window.
      }
    }
  }
  return null;
}

export function buildStartArgs(excludedServices: string[] = EXCLUDED_SERVICES): string[] {
  return ["start", "-x", excludedServices.join(",")];
}

function runSupabase(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(getSupabaseCommand(), args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/**
 * CLI status output embeds the anon and service-role keys. Keep diagnostics
 * useful without printing credentials: report only the field names present.
 */
function redactCliOutput(output: string): string {
  const fields = [...new Set([...output.matchAll(/"([A-Z_]+)"\s*:/g)].map((match) => match[1]))];
  return fields.length > 0 ? `fields: ${fields.join(", ")}` : "no status fields present";
}

export function main(): void {
  // Ownership is decided before starting: `supabase start` exits 0 whether it
  // started the stack or found it already running, so the start exit code
  // cannot say which happened. Stopping a stack the runner did not start would
  // take down a developer's long-lived local backend.
  const preExisting = parseStackEndpoints(runSupabase(["status", "-o", "json"]).stdout);
  const startedThisRun = preExisting === null;

  if (startedThisRun) {
    const started = runSupabase(buildStartArgs());
    if (started.status !== 0) {
      // The CLI status output carries the anon and service-role keys, so only
      // a redacted failure line is ever printed.
      console.error(
        `supabase start failed with status ${started.status}: ${redactCliOutput(started.stderr || started.stdout)}`
      );
      process.exitCode = 1;
      return;
    }
  }

  // `supabase start` prints its own summary that need not carry the status
  // object, so endpoints are always re-read from `status -o json` afterwards.
  const endpoints = parseStackEndpoints(runSupabase(["status", "-o", "json"]).stdout);
  if (!endpoints) {
    console.error("Could not read local Supabase endpoints from `supabase status -o json`.");
    if (startedThisRun) runSupabase(["stop"]);
    process.exitCode = 1;
    return;
  }

  try {
    const suite = spawnSync(
      resolveLocalBin("vitest"),
      ["run", "src/__tests__/auth/external-auth-real-gotrue.test.ts"],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          RUN_AUTH_INTEGRATION_TESTS: "1",
          CLOIE_AUTH_INTEGRATION_URL: endpoints.apiUrl,
          CLOIE_AUTH_INTEGRATION_ANON_KEY: endpoints.anonKey,
          CLOIE_AUTH_INTEGRATION_SERVICE_KEY: endpoints.serviceKey,
          CLOIE_AUTH_INTEGRATION_MAIL_URL: endpoints.mailUrl,
        },
      }
    );
    process.exitCode = suite.status ?? 1;
  } finally {
    // Only tear down a stack this run brought up.
    if (startedThisRun) runSupabase(["stop"]);
  }
}

if (process.argv[1]?.endsWith("run-auth-integration.ts")) {
  main();
}
