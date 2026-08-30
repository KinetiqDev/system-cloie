import { describe, expect, it, vi } from "vitest";
import {
  parseDemoTargetMarkerOutput,
  readDemoTargetMarker,
  resetDemoDatabase,
  validateDemoResetTarget,
  verifyDemoTargetMarker,
  writeDemoTargetMarker,
} from "../../../scripts/reset-demo-database";

const DEMO_BACKEND_ID = "demo-backend-id";
const PRIMARY_BACKEND_ID = "primary-backend-id";
const DEMO_DATABASE_ID = "demo-database-id";
const DEMO_SUPABASE_URL = "https://demo.cloie.example.test";
const DEMO_DIRECT_URL = "postgresql://postgres:secret@db-demo.cloie.example.test:5432/postgres";

function createEnvironment(overrides: Record<string, string | undefined> = {}) {
  return {
    CLOIE_DEPLOYMENT_KIND: "dedicated-demo",
    CLOIE_DEMO_ENABLED: "true",
    CLOIE_DEMO_SESSION_SECRET: "a".repeat(32),
    CLOIE_DEMO_ALLOWED_USERS: "demo-faculty@cloie.test",
    CLOIE_BACKEND_ID: DEMO_BACKEND_ID,
    CLOIE_DEMO_BACKEND_ID: DEMO_BACKEND_ID,
    CLOIE_PRIMARY_BACKEND_ID: PRIMARY_BACKEND_ID,
    CLOIE_DEMO_DATABASE_ID: DEMO_DATABASE_ID,
    NEXT_PUBLIC_SUPABASE_URL: DEMO_SUPABASE_URL,
    DATABASE_URL: "postgresql://postgres:secret@db-demo.cloie.example.test:5432/postgres",
    DIRECT_URL: DEMO_DIRECT_URL,
    NODE_ENV: "production",
    ...overrides,
  };
}

function demoMarker(
  overrides: Partial<{ backendId: string; databaseId: string; supabaseUrl: string }> = {}
) {
  return {
    backendId: DEMO_BACKEND_ID,
    databaseId: DEMO_DATABASE_ID,
    supabaseUrl: DEMO_SUPABASE_URL,
    ...overrides,
  };
}

describe("dedicated demo database reset", () => {
  it("passes isolation validation for a consistent dedicated demo environment", () => {
    expect(validateDemoResetTarget(createEnvironment()).valid).toBe(true);
  });

  it("fails validation when URL/database evidence is malformed", () => {
    const result = validateDemoResetTarget(createEnvironment({ DIRECT_URL: "not-a-url" }));

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("DIRECT_URL is not a valid URL.");
  });

  it("rejects a configured primary backend identity", () => {
    const result = validateDemoResetTarget(
      createEnvironment({ CLOIE_DEMO_BACKEND_ID: PRIMARY_BACKEND_ID })
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "The dedicated demo and primary Production backend identities must differ."
    );
  });

  it("does not run destructive commands when isolation validation fails", () => {
    const runCommand = vi.fn();

    expect(() =>
      resetDemoDatabase(createEnvironment({ CLOIE_BACKEND_ID: PRIMARY_BACKEND_ID }), runCommand)
    ).toThrow("Demo target isolation FAILED");

    expect(runCommand).not.toHaveBeenCalled();
  });

  it("rejects an absent target marker before the destructive reset", () => {
    const runCommand = vi.fn();

    expect(() => resetDemoDatabase(createEnvironment(), runCommand, () => null)).toThrow(
      "does not carry the System CLOIE demo target marker"
    );

    expect(runCommand).not.toHaveBeenCalled();
  });

  it("rejects a marker with a mismatched backend identity before the destructive reset", () => {
    const runCommand = vi.fn();

    expect(() =>
      resetDemoDatabase(createEnvironment(), runCommand, () =>
        demoMarker({ backendId: PRIMARY_BACKEND_ID })
      )
    ).toThrow('The demo target marker identifies backend "primary-backend-id"');

    expect(runCommand).not.toHaveBeenCalled();
  });

  it("rejects a marker with a mismatched Supabase URL before the destructive reset", () => {
    const runCommand = vi.fn();

    expect(() =>
      resetDemoDatabase(createEnvironment(), runCommand, () =>
        demoMarker({ supabaseUrl: "https://primary.cloie.example.test" })
      )
    ).toThrow("The demo target marker serves Supabase URL");

    expect(runCommand).not.toHaveBeenCalled();
  });

  it("rejects a marker with a mismatched database identity before the destructive reset", () => {
    const runCommand = vi.fn();

    expect(() =>
      resetDemoDatabase(createEnvironment(), runCommand, () =>
        demoMarker({ databaseId: "primary-database-id" })
      )
    ).toThrow('The demo target marker identifies database "primary-database-id"');

    expect(runCommand).not.toHaveBeenCalled();
  });

  it("accepts a custom self-hosted target only with a consistent identity and marker", () => {
    const runCommand = vi.fn();
    const persistMarker = vi.fn();

    resetDemoDatabase(createEnvironment(), runCommand, () => demoMarker(), persistMarker);

    expect(runCommand.mock.calls).toEqual([
      ["supabase", ["db", "reset", "--db-url", DEMO_DIRECT_URL, "--no-seed", "--yes"]],
      ["prisma", ["generate", "--schema", "prisma"]],
      ["prisma", ["db", "seed"]],
    ]);
    expect(persistMarker).toHaveBeenCalledWith(DEMO_DIRECT_URL, createEnvironment());
  });

  it("rejects when DATABASE_URL points at a different marked database", () => {
    const runCommand = vi.fn();
    const environment = createEnvironment({
      DATABASE_URL: "postgresql://postgres:secret@primary-db:5432/postgres",
    });
    const readMarker = vi.fn((databaseUrl: string) =>
      databaseUrl === DEMO_DIRECT_URL
        ? demoMarker()
        : demoMarker({ databaseId: "primary-database-id" })
    );

    expect(() => resetDemoDatabase(environment, runCommand, readMarker)).toThrow(
      'DATABASE_URL target: The demo target marker identifies database "primary-database-id"'
    );
    expect(runCommand).not.toHaveBeenCalled();
    expect(readMarker).toHaveBeenCalledWith(DEMO_DIRECT_URL);
    expect(readMarker).toHaveBeenCalledWith(environment.DATABASE_URL);
  });

  it("fails closed when the marker query cannot be executed", () => {
    const runCommand = vi.fn();
    const runQuery = vi.fn(() => {
      throw new Error("connection refused");
    });

    expect(readDemoTargetMarker(DEMO_DIRECT_URL, runQuery)).toBeNull();
    expect(runQuery).toHaveBeenCalledWith(
      "supabase",
      expect.arrayContaining(["db", "query", "--db-url", DEMO_DIRECT_URL])
    );

    expect(() =>
      resetDemoDatabase(createEnvironment(), runCommand, () =>
        readDemoTargetMarker(DEMO_DIRECT_URL, runQuery)
      )
    ).toThrow("does not carry the System CLOIE demo target marker");
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("parses the marker row from JSON query output", () => {
    expect(
      parseDemoTargetMarkerOutput(
        JSON.stringify([
          {
            backend_id: DEMO_BACKEND_ID,
            database_id: DEMO_DATABASE_ID,
            supabase_url: DEMO_SUPABASE_URL,
          },
        ])
      )
    ).toEqual(demoMarker());
  });

  it("parses the marker row from CSV query output", () => {
    expect(
      parseDemoTargetMarkerOutput(
        [
          "backend_id,database_id,supabase_url",
          `${DEMO_BACKEND_ID},${DEMO_DATABASE_ID},${DEMO_SUPABASE_URL}`,
        ].join("\n")
      )
    ).toEqual(demoMarker());
  });

  it("rejects empty, malformed, or multi-row marker output", () => {
    expect(parseDemoTargetMarkerOutput("")).toBeNull();
    expect(parseDemoTargetMarkerOutput("not json, not csv")).toBeNull();
    expect(parseDemoTargetMarkerOutput("backend_id,database_id,supabase_url\n")).toBeNull();
    expect(
      parseDemoTargetMarkerOutput(
        [
          "backend_id,database_id,supabase_url",
          `${DEMO_BACKEND_ID},${DEMO_DATABASE_ID},${DEMO_SUPABASE_URL}`,
          `${PRIMARY_BACKEND_ID},primary-database-id,https://primary.cloie.example.test`,
        ].join("\n")
      )
    ).toBeNull();
  });

  it("verifies the marker against the configured demo identity and URL", () => {
    expect(verifyDemoTargetMarker(demoMarker(), createEnvironment())).toBeNull();
    expect(verifyDemoTargetMarker(null, createEnvironment())).not.toBeNull();
    expect(
      verifyDemoTargetMarker(demoMarker({ backendId: "other-backend" }), createEnvironment())
    ).not.toBeNull();
    expect(
      verifyDemoTargetMarker(
        demoMarker({ supabaseUrl: "https://other.example.test" }),
        createEnvironment()
      )
    ).not.toBeNull();
  });

  it("persists an idempotent marker upsert through the direct URL", () => {
    const runQuery = vi.fn<(command: string, args: string[]) => string>(() => "");

    writeDemoTargetMarker(DEMO_DIRECT_URL, createEnvironment(), runQuery);

    const args = runQuery.mock.calls[0][1];
    expect(args).toContain("--db-url");
    const sql = args.at(-1) ?? "";
    expect(args).toContain(DEMO_DIRECT_URL);
    expect(sql).toContain("CREATE SCHEMA IF NOT EXISTS cloie_ops");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS cloie_ops.demo_target");
    expect(sql).toContain("ALTER TABLE cloie_ops.demo_target ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("REVOKE ALL ON TABLE cloie_ops.demo_target");
    expect(sql).toContain(`'${DEMO_BACKEND_ID}', '${DEMO_DATABASE_ID}', '${DEMO_SUPABASE_URL}'`);
    expect(sql).toContain("ON CONFLICT (singleton) DO UPDATE");
  });

  it("refuses to persist a marker without the demo identity or URL", () => {
    const runQuery = vi.fn();

    expect(() =>
      writeDemoTargetMarker(
        DEMO_DIRECT_URL,
        createEnvironment({ CLOIE_DEMO_BACKEND_ID: "" }),
        runQuery
      )
    ).toThrow("Cannot persist the demo target marker");
    expect(runQuery).not.toHaveBeenCalled();

    expect(() =>
      writeDemoTargetMarker(
        DEMO_DIRECT_URL,
        createEnvironment({ CLOIE_DEMO_DATABASE_ID: "" }),
        runQuery
      )
    ).toThrow("Cannot persist the demo target marker");
    expect(runQuery).not.toHaveBeenCalled();
  });
});
