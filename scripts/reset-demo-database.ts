import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import { resolveLocalBin } from "./resolve-local-bin";
import {
  validateDemoTargetIsolation,
  type ValidationResult,
} from "./validate-demo-target-isolation";

loadEnvConfig(process.cwd());

type Environment = Record<string, string | undefined>;
type CommandRunner = (command: string, args: string[]) => void;
type LinkedProjectRefReader = () => string | null;

export function validateDemoResetTarget(environment: Environment = process.env): ValidationResult {
  return validateDemoTargetIsolation(environment);
}

export function readLinkedProjectRef(): string | null {
  try {
    const projectRef = readFileSync("supabase/.temp/project-ref", "utf8").trim();
    return projectRef || null;
  } catch {
    return null;
  }
}

export function resetDemoDatabase(
  environment: Environment = process.env,
  runCommand: CommandRunner = (command, args) => {
    const childEnvironment: NodeJS.ProcessEnv = {
      ...environment,
      NODE_ENV: "production",
    };
    delete childEnvironment.VITEST;

    execFileSync(resolveLocalBin(command), args, {
      env: childEnvironment,
      shell: process.platform === "win32",
      stdio: "inherit",
    });
  },
  getLinkedProjectRef: LinkedProjectRefReader = readLinkedProjectRef
): void {
  const validation = validateDemoResetTarget(environment);
  if (!validation.valid) {
    throw new Error(`Demo target isolation FAILED:\n${validation.errors.join("\n")}`);
  }

  const linkedProjectRef = getLinkedProjectRef();
  if (linkedProjectRef !== environment.CLOIE_DEMO_SUPABASE_PROJECT_REF) {
    throw new Error(
      [
        "Demo target isolation FAILED:",
        `Supabase linked project is "${linkedProjectRef ?? "<unlinked>"}"; expected the configured dedicated demo project.`,
        "Run pnpm supabase:link with SUPABASE_PROJECT_REF set to the dedicated demo project before resetting.",
      ].join("\n")
    );
  }

  // Prisma cannot recreate SQL-only triggers and policies. Reset through the
  // linked Supabase migration history so the seed sees the full schema contract.
  runCommand("supabase", ["db", "reset", "--linked", "--no-seed", "--yes"]);
  runCommand("prisma", ["generate", "--schema", "prisma"]);
  runCommand("prisma", ["db", "seed"]);
}

function main(): void {
  try {
    resetDemoDatabase();
    console.log("Dedicated demo database reset and fixtures seeded.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
