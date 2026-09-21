import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import { verifyDisposableDatabaseTarget } from "../src/lib/db/verify-database-target";
import { discoverDatabaseSuites } from "./lib/database-suite-discovery";
import { resolveLocalBin } from "./resolve-local-bin";

loadEnvConfig(process.cwd());

const DATABASE_TEST_ROLE = "test_authenticated";

async function prepareDatabaseTestRole(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`
      DO $block$
      BEGIN
        CREATE ROLE ${DATABASE_TEST_ROLE} LOGIN INHERIT;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $block$;
    `);
    await prisma.$executeRawUnsafe(`GRANT authenticated TO ${DATABASE_TEST_ROLE}`);
    await prisma.$executeRawUnsafe(`GRANT ${DATABASE_TEST_ROLE} TO CURRENT_USER`);
  } finally {
    await prisma.$disconnect();
  }
}

export function buildVitestArgs(suites: string[]): string[] {
  return ["run", "--no-file-parallelism", ...suites];
}

export function validateTargetOrExit(): boolean {
  const target = verifyDisposableDatabaseTarget(process.env);
  if (!target.valid) {
    console.error("Disposable database target validation FAILED — refusing to run database tests:");
    for (const err of target.errors) console.error(`  - ${err}`);
    return false;
  }
  return true;
}

async function main(): Promise<void> {
  if (!validateTargetOrExit()) {
    process.exitCode = 1;
    return;
  }

  const suites = discoverDatabaseSuites(process.cwd());
  if (suites.length === 0) {
    console.error("No database suites discovered — check discovery convention.");
    process.exitCode = 1;
    return;
  }

  await prepareDatabaseTestRole();

  console.log(`Discovered ${suites.length} database suites:`);
  for (const s of suites) console.log(`  - ${s}`);

  const vitestBin = resolveLocalBin("vitest");
  const result = spawnSync(vitestBin, buildVitestArgs(suites), {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exitCode = 1;
    return;
  }
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
