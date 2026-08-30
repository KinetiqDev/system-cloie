import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import { resolveLocalBin } from "./resolve-local-bin";
import {
  readDemoTargetMarker,
  validateDemoResetTarget,
  verifyConfiguredDemoDatabaseTargets,
  writeDemoTargetMarker,
} from "./reset-demo-database";

loadEnvConfig(process.cwd());

/**
 * Baseline database reset + seed for the dedicated dev/demo Supabase project.
 *
 * Mirrors `pnpm demo:reset`'s safety contract: refuses to run unless the
 * configured backend identity is the dedicated demo identity (differing from
 * primary Production), the URL/database evidence is present, and the target
 * carries a persisted marker matching the demo backend identity and public
 * Supabase URL. Then resets the isolated database through the explicit direct
 * database URL (migration history, including SQL-only triggers and policies),
 * regenerates Prisma, runs the baseline seed (`prisma/seed-baseline.ts`):
 * programs, majors, courses, institutional evaluation templates, and school
 * years. No users, outcomes, assignments, evaluations, or responses. The
 * marker is re-persisted after seeding so the target stays positively
 * identified for the next destructive reset.
 *
 * Requires NODE_ENV=production in the caller environment:
 *   NODE_ENV=production pnpm seed:baseline
 */
function runCommand(command: string, args: string[]): void {
  execFileSync(resolveLocalBin(command), args, {
    env: { ...process.env, NODE_ENV: "production" },
    shell: process.platform === "win32",
    stdio: "inherit",
  });
}

function seedBaselineDatabase(): void {
  const validation = validateDemoResetTarget();
  if (!validation.valid) {
    throw new Error(`Baseline seed target isolation FAILED:\n${validation.errors.join("\n")}`);
  }
  const markerError = verifyConfiguredDemoDatabaseTargets(process.env, (databaseUrl) =>
    readDemoTargetMarker(databaseUrl)
  );
  if (markerError) {
    throw new Error(`Baseline seed target isolation FAILED:\n${markerError}`);
  }

  const directUrl = process.env.DIRECT_URL ?? "";

  runCommand("supabase", ["db", "reset", "--db-url", directUrl, "--no-seed", "--yes"]);
  runCommand("prisma", ["generate", "--schema", "prisma"]);
  runCommand("tsx", ["prisma/seed-baseline.ts"]);
  writeDemoTargetMarker(directUrl, process.env);
  console.log("Dev database reset and baseline fixtures seeded.");
}

function main(): void {
  try {
    seedBaselineDatabase();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
