import { execFileSync } from "node:child_process";
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

export function validateDemoResetTarget(environment: Environment = process.env): ValidationResult {
  return validateDemoTargetIsolation(environment);
}

export function resetDemoDatabase(
  environment: Environment = process.env,
  runCommand: CommandRunner = (command, args) => {
    execFileSync(resolveLocalBin(command), args, {
      shell: process.platform === "win32",
      stdio: "inherit",
    });
  }
): void {
  const validation = validateDemoResetTarget(environment);
  if (!validation.valid) {
    throw new Error(`Demo target isolation FAILED:\n${validation.errors.join("\n")}`);
  }

  runCommand("prisma", ["db", "push", "--schema", "prisma", "--force-reset", "--accept-data-loss"]);
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
