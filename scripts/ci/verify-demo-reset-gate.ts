/**
 * Scheduled demo-reset gate (issue #551).
 *
 * The real `pnpm demo:reset` requires a linked dedicated-demo Supabase
 * project and must never run in CI. What CI can and should prove on a
 * schedule is that the reset gate itself refuses unsafe targets before any
 * destructive command: this script executes
 * `validateDemoTargetIsolation` (the same function the reset path calls)
 * against controlled environment matrices and asserts each outcome.
 */
import { pathToFileURL } from "node:url";

import { validateDemoTargetIsolation } from "../validate-demo-target-isolation";

const DEMO_REF = "refdemo000000000000000000000001";
const PRIMARY_REF = "refprimary0000000000000000000002";

function dedicatedDemoEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "production",
    CLOIE_DEPLOYMENT_KIND: "dedicated-demo",
    CLOIE_DEMO_ENABLED: "true",
    CLOIE_DEMO_SESSION_SECRET: "scheduled-gate-session-secret-must-be-32-chars!!",
    CLOIE_DEMO_ALLOWED_USERS: "demo-secretary@cloie.test",
    CLOIE_DEMO_SUPABASE_PROJECT_REF: DEMO_REF,
    CLOIE_PRIMARY_SUPABASE_PROJECT_REF: PRIMARY_REF,
    SUPABASE_PROJECT_REF: DEMO_REF,
    NEXT_PUBLIC_SUPABASE_URL: `https://${DEMO_REF}.supabase.co`,
    DATABASE_URL: `postgresql://postgres.${DEMO_REF}:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
    DIRECT_URL: `postgresql://postgres.${DEMO_REF}:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
    ...overrides,
  } as Record<string, string | undefined>;
}

type GateResult = { valid: boolean; failures: string[] };

export function verifyDemoResetGate(log: (message: string) => void = () => {}): GateResult {
  const failures: string[] = [];

  // 1. A hosted/shared target without the dedicated-demo identity is refused.
  const shared = validateDemoTargetIsolation({
    NODE_ENV: "production",
    DATABASE_URL: `postgresql://postgres.${PRIMARY_REF}:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  });
  log(`shared target: ${shared.valid ? "ACCEPTED" : "refused"}`);
  if (shared.valid) failures.push("hosted target without dedicated-demo identity must be refused");

  // 2. A URL that identifies the primary Production project is refused even
  //    when every other demo variable is present.
  const primary = validateDemoTargetIsolation(
    dedicatedDemoEnv({
      DATABASE_URL: `postgresql://postgres.${PRIMARY_REF}:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
    })
  );
  log(`primary-ref target: ${primary.valid ? "ACCEPTED" : "refused"}`);
  if (primary.valid) failures.push("primary Production project reference must be refused");

  // 3. A weak demo session secret is refused.
  const weakSecret = validateDemoTargetIsolation(
    dedicatedDemoEnv({ CLOIE_DEMO_SESSION_SECRET: "too-short" })
  );
  log(`weak secret: ${weakSecret.valid ? "ACCEPTED" : "refused"}`);
  if (weakSecret.valid) failures.push("weak demo session secret must be refused");

  // 4. A self-consistent dedicated-demo configuration is accepted — the gate
  //    must not lock the legitimate demo reset path out.
  const valid = validateDemoTargetIsolation(dedicatedDemoEnv());
  log(`valid dedicated-demo target: ${valid.valid ? "accepted" : "REFUSED"}`);
  if (!valid.valid) failures.push(...valid.errors.map((error) => `valid env refused: ${error}`));

  return { valid: failures.length === 0, failures };
}

function main(): void {
  const result = verifyDemoResetGate((message) => console.log(`[demo-reset-gate] ${message}`));
  if (!result.valid) {
    console.error("[demo-reset-gate] FAILED:");
    for (const failure of result.failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log("[demo-reset-gate] Demo reset isolation gate behaves as required.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
