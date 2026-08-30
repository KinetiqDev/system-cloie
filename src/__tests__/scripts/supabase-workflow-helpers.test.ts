import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getSupabaseCommand, requireDirectUrl } from "../../../scripts/supabase-cli";
import {
  buildMigrationArgs,
  buildMigrationFilePath,
  parseMigrationCliArgs,
  sanitizeMigrationName,
} from "../../../scripts/create-supabase-migration";
import { buildTypegenArgs, OUTPUT_PATH } from "../../../scripts/generate-supabase-types";
import {
  buildLocalCommandArgs,
  buildRemoteCommandArgs,
  describeCommand,
  parseTarget,
} from "../../../scripts/run-supabase-command";

describe("supabase workflow helpers", () => {
  it("resolves the local Supabase CLI binary when available", () => {
    const resolvedCommand = getSupabaseCommand();

    expect(resolvedCommand.toLowerCase()).toContain("supabase");
  });

  it("requires DIRECT_URL for remote commands and fails clearly without it", () => {
    const previous = process.env.DIRECT_URL;
    delete process.env.DIRECT_URL;
    try {
      expect(() => requireDirectUrl()).toThrow(/DIRECT_URL is required/);
    } finally {
      if (previous !== undefined) process.env.DIRECT_URL = previous;
    }
  });

  it("returns the configured DIRECT_URL when present", () => {
    const previous = process.env.DIRECT_URL;
    process.env.DIRECT_URL = "postgresql://direct-url";
    try {
      expect(requireDirectUrl()).toBe("postgresql://direct-url");
    } finally {
      if (previous !== undefined) process.env.DIRECT_URL = previous;
      else delete process.env.DIRECT_URL;
    }
  });

  it("parses the local and remote targets", () => {
    expect(parseTarget("local")).toBe("local");
    expect(parseTarget("remote")).toBe("remote");
    expect(() => parseTarget(undefined)).toThrow(/local|remote/);
    expect(() => parseTarget("linked")).toThrow(/local|remote/);
  });

  it("builds local lifecycle args that always target the local stack", () => {
    expect(buildLocalCommandArgs("start")).toEqual(["start"]);
    expect(buildLocalCommandArgs("stop")).toEqual(["stop"]);
    expect(buildLocalCommandArgs("status")).toEqual(["status"]);
    expect(buildLocalCommandArgs("migration-list")).toEqual(["migration", "list", "--local"]);
  });

  it("builds a local destructive reset that is unconditionally --local", () => {
    expect(buildLocalCommandArgs("reset")).toEqual(["db", "reset", "--local", "--yes"]);
    expect(buildLocalCommandArgs("reset")).not.toContain("--db-url");
    expect(buildLocalCommandArgs("reset")).not.toContain("--linked");
  });

  it("rejects unknown local commands", () => {
    expect(() => buildLocalCommandArgs("push")).toThrow(/Unsupported local command/);
  });

  it("builds remote args from the direct database url with no linked flag", () => {
    expect(buildRemoteCommandArgs("migration-list", "postgresql://direct-url")).toEqual([
      "migration",
      "list",
      "--db-url",
      "postgresql://direct-url",
    ]);
    expect(buildRemoteCommandArgs("push", "postgresql://direct-url")).toEqual([
      "db",
      "push",
      "--db-url",
      "postgresql://direct-url",
    ]);
    expect(buildRemoteCommandArgs("push", "postgresql://direct-url", ["--dry-run"])).toEqual([
      "db",
      "push",
      "--db-url",
      "postgresql://direct-url",
      "--dry-run",
    ]);
  });

  it("rejects unknown remote commands and never supports a generic remote reset", () => {
    expect(() => buildRemoteCommandArgs("reset", "postgresql://direct-url")).toThrow(
      /Unsupported remote command/
    );
  });

  it("identifies local and remote targets without printing the url", () => {
    expect(describeCommand("local", "start")).toBe("Supabase CLI: local start");
    expect(describeCommand("remote", "push")).toBe("Supabase CLI: remote push (DIRECT_URL target)");
    expect(describeCommand("remote", "push")).not.toContain("postgresql://");
  });

  it("generates deterministic baseline diff args", () => {
    expect(
      buildMigrationArgs({
        mode: "baseline",
        schemaPath: "prisma",
        outputPath: "supabase/migrations/20260419000100_init_public_schema.sql",
      })
    ).toEqual([
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      "prisma",
      "--script",
      "--output",
      "supabase/migrations/20260419000100_init_public_schema.sql",
    ]);
  });

  it("generates diff args from the direct database url", () => {
    expect(
      buildMigrationArgs({
        mode: "diff",
        schemaPath: "prisma",
        databaseUrl: "postgresql://direct-url",
        outputPath: "supabase/migrations/20260419001000_add_student_profile_columns.sql",
      })
    ).toEqual([
      "migrate",
      "diff",
      "--from-url",
      "postgresql://direct-url",
      "--to-schema-datamodel",
      "prisma",
      "--script",
      "--output",
      "supabase/migrations/20260419001000_add_student_profile_columns.sql",
    ]);
  });

  it("parses migration cli args when pnpm forwards a literal double-dash", () => {
    expect(
      parseMigrationCliArgs([
        "baseline",
        "--",
        "init_public_schema",
        "--timestamp",
        "20260419000100",
      ])
    ).toEqual({
      mode: "baseline",
      name: "init_public_schema",
      timestamp: "20260419000100",
    });
  });

  it("sanitizes migration names into predictable sql file names", () => {
    expect(sanitizeMigrationName("Add Student Profile Columns")).toBe(
      "add_student_profile_columns"
    );
    const migrationPath = buildMigrationFilePath("Add Student Profile Columns", "20260419001000");

    expect(migrationPath).toBe(
      "supabase/migrations/20260419001000_add_student_profile_columns.sql"
    );
    expect(migrationPath).not.toContain("\\");
  });

  it("builds local typegen args from the local stack", () => {
    expect(buildTypegenArgs("local")).toEqual([
      "gen",
      "types",
      "typescript",
      "--local",
      "--schema",
      "public",
    ]);
    expect(OUTPUT_PATH).toBe("src/types/supabase-database.ts");
  });

  it("builds remote typegen args from the direct database url", () => {
    expect(buildTypegenArgs("remote", "postgresql://direct-url")).toEqual([
      "gen",
      "types",
      "typescript",
      "--db-url",
      "postgresql://direct-url",
      "--schema",
      "public",
    ]);
  });

  it("fails clearly when remote typegen lacks a direct url", () => {
    expect(() => buildTypegenArgs("remote")).toThrow(/DIRECT_URL is required/);
    expect(buildTypegenArgs("local")).not.toContain("--linked");
    expect(buildTypegenArgs("remote", "postgresql://direct-url")).not.toContain("--linked");
  });

  it("cleans duplicate responses before enforcing assignment uniqueness", async () => {
    const migration = await readFile(
      path.join(
        process.cwd(),
        "supabase/migrations/20260421103000_add_outline_defense_scope_and_targets.sql"
      ),
      "utf8"
    );

    expect(migration).toContain("ROW_NUMBER() OVER (");
    expect(migration).toContain('PARTITION BY "assignment_id"');
    expect(migration).toContain('DELETE FROM "responses"');
    expect(migration).toContain('CREATE UNIQUE INDEX "responses_assignment_id_key"');
  });
});
