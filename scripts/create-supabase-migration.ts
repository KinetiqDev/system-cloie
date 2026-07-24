import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";
import { pathToFileURL } from "node:url";

import { resolveLocalBin } from "./resolve-local-bin";

loadEnvConfig(process.cwd());

type MigrationMode = "baseline" | "diff";

type BuildMigrationArgsInput = {
  mode: MigrationMode;
  schemaPath: string;
  outputPath: string;
  databaseUrl?: string;
};

type ParsedMigrationCliArgs = {
  mode: MigrationMode | undefined;
  name: string | undefined;
  timestamp: string;
};

export function sanitizeMigrationName(name: string) {
  const sanitized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!sanitized) {
    throw new Error("Migration name must contain letters or numbers.");
  }

  return sanitized;
}

export function buildMigrationFilePath(name: string, timestamp: string) {
  return `supabase/migrations/${timestamp}_${sanitizeMigrationName(name)}.sql`;
}

export function buildMigrationArgs({
  mode,
  schemaPath,
  outputPath,
  databaseUrl,
}: BuildMigrationArgsInput) {
  if (mode === "baseline") {
    return [
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      schemaPath,
      "--script",
      "--output",
      outputPath,
    ];
  }

  if (!databaseUrl) {
    throw new Error("DIRECT_URL or DATABASE_URL is required for diff migrations.");
  }

  return [
    "migrate",
    "diff",
    "--from-url",
    databaseUrl,
    "--to-schema-datamodel",
    schemaPath,
    "--script",
    "--output",
    outputPath,
  ];
}

function parseTimestamp(args: string[]) {
  const index = args.indexOf("--timestamp");

  return index === -1
    ? new Date()
        .toISOString()
        .replace(/[-:TZ.]/g, "")
        .slice(0, 14)
    : args[index + 1];
}

export function parseMigrationCliArgs(args: string[]): ParsedMigrationCliArgs {
  const filteredArgs = args[1] === "--" ? [args[0], ...args.slice(2)] : args;

  return {
    mode: filteredArgs[0] as MigrationMode | undefined,
    name: filteredArgs[1],
    timestamp: parseTimestamp(filteredArgs.slice(2)),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { mode, name, timestamp } = parseMigrationCliArgs(process.argv.slice(2));

  if (mode !== "baseline" && mode !== "diff") {
    throw new Error(
      "Usage: tsx scripts/create-supabase-migration.ts <baseline|diff> <name> [--timestamp YYYYMMDDHHMMSS]"
    );
  }

  if (!name) {
    throw new Error("Migration name is required.");
  }

  const outputPath = buildMigrationFilePath(name, timestamp);
  const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

  mkdirSync(join("supabase", "migrations"), { recursive: true });

  execFileSync(
    resolveLocalBin("prisma"),
    buildMigrationArgs({
      mode,
      schemaPath: "prisma",
      outputPath,
      databaseUrl,
    }),
    { shell: process.platform === "win32", stdio: "inherit" }
  );

  console.log(`Created migration at ${outputPath}`);
}
