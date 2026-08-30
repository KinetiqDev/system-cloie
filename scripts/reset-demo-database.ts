import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import { resolveLocalBin } from "./resolve-local-bin";
import {
  isValidBackendId,
  validateDemoTargetIsolation,
  type ValidationResult,
} from "./validate-demo-target-isolation";

loadEnvConfig(process.cwd());

type Environment = Record<string, string | undefined>;
type CommandRunner = (command: string, args: string[]) => void;
type QueryRunner = (command: string, args: string[]) => string;

/**
 * Positive identity of a demo database target, persisted in a private schema
 * on the target itself. The marker is written during provisioning and must
 * match the configured demo backend, database identity, and public Supabase
 * URL before any destructive reset may run. It is deliberately not part of
 * the shared migration history. Primary Production and other targets must
 * never carry it.
 */
export type DemoTargetMarker = {
  backendId: string;
  databaseId: string;
  supabaseUrl: string;
};

export type MarkerReader = (directUrl: string) => DemoTargetMarker | null;

export type MarkerWriter = (directUrl: string, environment: Environment) => void;

export function validateDemoResetTarget(environment: Environment = process.env): ValidationResult {
  return validateDemoTargetIsolation(environment);
}

const MARKER_SCHEMA = "cloie_ops";
const MARKER_TABLE = `${MARKER_SCHEMA}.demo_target`;
const MARKER_READ_SQL = `SELECT backend_id, database_id, supabase_url FROM ${MARKER_TABLE} LIMIT 2`;

function runMarkerQuery(command: string, args: string[]): string {
  return execFileSync(resolveLocalBin(command), args, {
    env: { ...process.env, NODE_ENV: "production" },
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Parses `supabase db query` output for the marker row. Accepts plain JSON
 * (`[{ "backend_id": ..., "supabase_url": ... }]`) and CSV (header row plus
 * exactly one data row). Returns null for anything else so the reset fails
 * closed on unexpected output.
 */
export function parseDemoTargetMarkerOutput(output: string): DemoTargetMarker | null {
  const trimmed = output.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("[")
    ? parseJsonMarkerRows(trimmed)
    : parseCsvMarkerRows(
        trimmed
          .split(/\r?\n/)
          .map(splitCsvLine)
          .filter((fields) => fields.some((field) => field.trim() !== ""))
      );
}

function toMarker(row: Record<string, unknown>): DemoTargetMarker | null {
  const backendId = typeof row.backend_id === "string" ? row.backend_id.trim() : "";
  const databaseId = typeof row.database_id === "string" ? row.database_id.trim() : "";
  const supabaseUrl = typeof row.supabase_url === "string" ? row.supabase_url.trim() : "";
  if (!backendId || !databaseId || !supabaseUrl) {
    return null;
  }
  return { backendId, databaseId, supabaseUrl };
}

function parseJsonMarkerRows(trimmed: string): DemoTargetMarker | null {
  try {
    const rows: unknown = JSON.parse(trimmed);
    if (!Array.isArray(rows) || rows.length !== 1) {
      return null;
    }
    return toMarker(rows[0] as Record<string, unknown>);
  } catch {
    return null;
  }
}

function parseCsvMarkerRows(rows: string[][]): DemoTargetMarker | null {
  // Header row plus exactly one data row.
  if (rows.length !== 2) {
    return null;
  }
  const header = rows[0].map((name) => name.trim().toLowerCase());
  // A column missing from the header yields undefined and fails closed.
  return toMarker({
    backend_id: rows[1][header.indexOf("backend_id")],
    database_id: rows[1][header.indexOf("database_id")],
    supabase_url: rows[1][header.indexOf("supabase_url")],
  });
}

/**
 * Reads the target-persisted marker through the direct database URL using the
 * Supabase CLI (`db query`). Any failure — unreachable target, missing table,
 * empty or malformed output — returns null and the caller refuses to proceed.
 */
export function readDemoTargetMarker(
  directUrl: string,
  runQuery: QueryRunner = runMarkerQuery
): DemoTargetMarker | null {
  if (!directUrl) {
    return null;
  }
  try {
    const output = runQuery("supabase", [
      "db",
      "query",
      "--db-url",
      directUrl,
      "--output",
      "json",
      "--agent",
      "no",
      MARKER_READ_SQL,
    ]);
    return parseDemoTargetMarkerOutput(output);
  } catch {
    return null;
  }
}

export function verifyDemoTargetMarker(
  marker: DemoTargetMarker | null,
  environment: Environment
): string | null {
  const demoBackendId = environment.CLOIE_DEMO_BACKEND_ID;
  const demoDatabaseId = environment.CLOIE_DEMO_DATABASE_ID;
  const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL;

  if (!isValidBackendId(demoBackendId) || !isValidBackendId(demoDatabaseId) || !supabaseUrl) {
    return "CLOIE_DEMO_BACKEND_ID, CLOIE_DEMO_DATABASE_ID, and NEXT_PUBLIC_SUPABASE_URL are required to verify the demo target marker.";
  }
  if (!marker) {
    return `The demo database does not carry the System CLOIE demo target marker (${MARKER_TABLE}). Refusing to reset an unmarked target.`;
  }
  if (marker.backendId !== demoBackendId) {
    return `The demo target marker identifies backend "${marker.backendId}"; expected "${demoBackendId}". Refusing to reset.`;
  }
  if (marker.databaseId !== demoDatabaseId) {
    return `The demo target marker identifies database "${marker.databaseId}"; expected "${demoDatabaseId}". Refusing to reset.`;
  }
  if (marker.supabaseUrl !== supabaseUrl) {
    return `The demo target marker serves Supabase URL "${marker.supabaseUrl}"; expected "${supabaseUrl}". Refusing to reset.`;
  }
  return null;
}

export function verifyConfiguredDemoDatabaseTargets(
  environment: Environment,
  readMarker: MarkerReader
): string | null {
  const directUrl = environment.DIRECT_URL ?? "";
  const databaseUrl = environment.DATABASE_URL ?? "";
  const directError = verifyDemoTargetMarker(readMarker(directUrl), environment);
  if (directError) {
    return `DIRECT_URL target: ${directError}`;
  }
  const runtimeError = verifyDemoTargetMarker(readMarker(databaseUrl), environment);
  if (runtimeError) {
    return `DATABASE_URL target: ${runtimeError}`;
  }
  return null;
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Persists (or refreshes) the demo target marker after a successful reset and
 * seed, so the freshly provisioned target remains positively identified for
 * the next destructive reset.
 */
export function writeDemoTargetMarker(
  directUrl: string,
  environment: Environment,
  runQuery: QueryRunner = runMarkerQuery
): void {
  const demoBackendId = environment.CLOIE_DEMO_BACKEND_ID;
  const demoDatabaseId = environment.CLOIE_DEMO_DATABASE_ID;
  const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL;
  if (!isValidBackendId(demoBackendId) || !isValidBackendId(demoDatabaseId) || !supabaseUrl) {
    throw new Error(
      "Cannot persist the demo target marker: CLOIE_DEMO_BACKEND_ID, CLOIE_DEMO_DATABASE_ID, and NEXT_PUBLIC_SUPABASE_URL are required."
    );
  }

  const sql = [
    `CREATE SCHEMA IF NOT EXISTS ${MARKER_SCHEMA};`,
    `REVOKE ALL ON SCHEMA ${MARKER_SCHEMA} FROM PUBLIC, anon, authenticated;`,
    `CREATE TABLE IF NOT EXISTS ${MARKER_TABLE} (singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton), backend_id text NOT NULL, database_id text NOT NULL, supabase_url text NOT NULL);`,
    `ALTER TABLE ${MARKER_TABLE} ENABLE ROW LEVEL SECURITY;`,
    `REVOKE ALL ON TABLE ${MARKER_TABLE} FROM PUBLIC, anon, authenticated;`,
    `INSERT INTO ${MARKER_TABLE} (singleton, backend_id, database_id, supabase_url) VALUES (true, '${demoBackendId}', '${demoDatabaseId}', '${escapeSqlLiteral(supabaseUrl)}') ON CONFLICT (singleton) DO UPDATE SET backend_id = EXCLUDED.backend_id, database_id = EXCLUDED.database_id, supabase_url = EXCLUDED.supabase_url;`,
  ].join("\n");

  runQuery("supabase", ["db", "query", "--db-url", directUrl, "--agent", "no", sql]);
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
  readMarker: MarkerReader = (directUrl) => readDemoTargetMarker(directUrl),
  persistMarker: MarkerWriter = writeDemoTargetMarker
): void {
  const validation = validateDemoResetTarget(environment);
  if (!validation.valid) {
    throw new Error(`Demo target isolation FAILED:\n${validation.errors.join("\n")}`);
  }
  const markerError = verifyConfiguredDemoDatabaseTargets(environment, readMarker);
  if (markerError) {
    throw new Error(`Demo target isolation FAILED:\n${markerError}`);
  }

  const directUrl = environment.DIRECT_URL ?? "";

  // Prisma cannot recreate SQL-only triggers and policies. Reset through the
  // explicit direct database URL so the seed sees the full schema contract.
  runCommand("supabase", ["db", "reset", "--db-url", directUrl, "--no-seed", "--yes"]);
  runCommand("prisma", ["generate", "--schema", "prisma"]);
  runCommand("prisma", ["db", "seed"]);

  persistMarker(directUrl, environment);
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
