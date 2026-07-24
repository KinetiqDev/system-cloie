import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getSupabaseCommand } from "../../../scripts/supabase-cli";
import {
  buildMigrationArgs,
  buildMigrationFilePath,
  parseMigrationCliArgs,
  sanitizeMigrationName,
} from "../../../scripts/create-supabase-migration";
import { buildTypegenArgs, OUTPUT_PATH } from "../../../scripts/generate-supabase-types";
import {
  assertBaselineRepairSafe,
  getLatestMigrationVersion,
  getLatestMigrationVersionFromDirectory,
  parseRemoteMigrationVersions,
} from "../../../scripts/repair-latest-supabase-migration";
import { buildLoginArgs } from "../../../scripts/supabase-login";
import { buildLinkArgs } from "../../../scripts/supabase-link";

describe("supabase workflow helpers", () => {
  it("builds login args from the personal access token", () => {
    expect(buildLoginArgs("sbp_token")).toEqual(["login", "--token", "sbp_token"]);
  });

  it("resolves the local Supabase CLI binary when available", () => {
    const resolvedCommand = getSupabaseCommand();

    expect(resolvedCommand.toLowerCase()).toContain("supabase");
  });

  it("builds link args from project ref and optional password", () => {
    expect(buildLinkArgs("abcd1234")).toEqual(["link", "--project-ref", "abcd1234"]);
    expect(buildLinkArgs("abcd1234", "secret")).toEqual([
      "link",
      "--project-ref",
      "abcd1234",
      "--password",
      "secret",
    ]);
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

  it("finds the latest migration version from local filenames", () => {
    expect(
      getLatestMigrationVersion([
        "20260419000100_init_public_schema.sql",
        "20260419001000_add_student_profile_columns.sql",
      ])
    ).toBe("20260419001000");
  });

  it("fails clearly when no local sql migrations exist", () => {
    expect(() => getLatestMigrationVersion([])).toThrow(
      "No Supabase SQL migrations were found in supabase/migrations. Run pnpm supabase:migration:baseline or pnpm supabase:migration:diff first."
    );
  });

  it("fails clearly when the migrations directory does not exist", () => {
    expect(() =>
      getLatestMigrationVersionFromDirectory("supabase/migrations", () => {
        const error = new Error("ENOENT") as NodeJS.ErrnoException;

        error.code = "ENOENT";
        throw error;
      })
    ).toThrow(
      "Supabase migrations directory was not found at supabase/migrations. Run pnpm supabase:init and create a migration first."
    );
  });

  it("treats an empty remote migration history as baseline-safe", () => {
    const remoteVersions = parseRemoteMigrationVersions(`
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20260419000100 |                | 2026-04-19 00:01:00
    `);

    expect(remoteVersions).toEqual([]);
    expect(() => assertBaselineRepairSafe(remoteVersions)).not.toThrow();
  });

  it("blocks repair when the linked project already has remote migrations", () => {
    const remoteVersions = parseRemoteMigrationVersions(`
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20260419000100 | 20260419000100 | 2026-04-19 00:01:00
    `);

    expect(remoteVersions).toEqual(["20260419000100"]);
    expect(() => assertBaselineRepairSafe(remoteVersions)).toThrow(
      "The linked project already has remote migration history (latest remote version: 20260419000100). `pnpm supabase:migration:repair-latest` is only for an empty remote history during baseline setup or recovery."
    );
  });

  it("uses the linked type generation command and output path", () => {
    expect(buildTypegenArgs()).toEqual([
      "gen",
      "types",
      "typescript",
      "--linked",
      "--schema",
      "public",
    ]);
    expect(OUTPUT_PATH).toBe("src/types/supabase-database.ts");
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
