import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import { resolveLocalBin } from "./resolve-local-bin";
import { readLinkedProjectRef, validateDemoResetTarget } from "./reset-demo-database";

/**
 * Baseline database reset + seed for the dedicated dev/demo Supabase project.
 *
 * Mirrors `pnpm demo:reset`'s safety contract: refuses to run unless every
 * configured project identifier (and the CLI's linked project) identifies
 * CLOIE_DEMO_SUPABASE_PROJECT_REF, which must differ from the primary
 * Production project. Then resets the isolated database through the linked
 * migration history, regenerates Prisma, and runs the baseline seed
 * (`prisma/seed-baseline.ts`): programs, majors, courses, institutional
 * evaluation templates, and school years. No users, outcomes, assignments,
 * evaluations, or responses.
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

  const linkedProjectRef = readLinkedProjectRef();
  if (linkedProjectRef !== process.env.CLOIE_DEMO_SUPABASE_PROJECT_REF) {
    throw new Error(
      [
        "Baseline seed target isolation FAILED:",
        `Supabase linked project is "${linkedProjectRef ?? "<unlinked>"}"; expected the configured dev project.`,
        "Run pnpm supabase:link with SUPABASE_PROJECT_REF set to the dev project before seeding.",
      ].join("\n")
    );
  }

  runCommand("supabase", ["db", "reset", "--linked", "--no-seed", "--yes"]);
  runCommand("prisma", ["generate", "--schema", "prisma"]);
  runCommand("tsx", ["prisma/seed-baseline.ts"]);
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
