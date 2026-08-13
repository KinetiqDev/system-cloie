import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH =
  "supabase/migrations/20260812170000_add_canonical_user_name_expansion.sql";
const CONTRACT_MIGRATION_PATH =
  "supabase/migrations/20260813014341_remove_legacy_split_user_name_columns.sql";
const PRISMA_USER_MODEL_PATH = "prisma/models/identity-access.prisma";
const GENERATED_TYPES_PATH = "src/types/supabase-database.ts";

function readMigration() {
  return readFileSync(path.join(process.cwd(), MIGRATION_PATH), "utf8");
}

function readContractMigration() {
  return readFileSync(path.join(process.cwd(), CONTRACT_MIGRATION_PATH), "utf8");
}

function readUserModel() {
  return readFileSync(path.join(process.cwd(), PRISMA_USER_MODEL_PATH), "utf8");
}

function extractUserModelBlock(source: string) {
  const match = source.match(/model User \{[\s\S]*?\n\}/);
  expect(match).not.toBeNull();
  return match![0];
}

function extractUsersTableTypes(source: string) {
  const match = source.match(/users:\s*\{[\s\S]*?Relationships:\s*\[[\s\S]*?\]\s*\}/);
  expect(match).not.toBeNull();
  return match![0];
}

describe("canonical user name expansion migration contract", () => {
  it("is the only expansion migration for users.name and does not drop legacy columns", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);

    const expansionMigrations = readdirSync("supabase/migrations").filter((file) =>
      /canonical_user_name/.test(file)
    );
    expect(expansionMigrations).toEqual([
      "20260812170000_add_canonical_user_name_expansion.sql",
    ]);

    const migration = readMigration();

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "name" TEXT');
    expect(migration).toContain("concat_ws(");
    // Full whitespace class — not plain TRIM — so tabs/newlines are absent too.
    expect(migration).toContain(
      `NULLIF(regexp_replace("first_name", '^[[:space:]]+|[[:space:]]+$', '', 'g'), '')`
    );
    expect(migration).toContain(
      `NULLIF(regexp_replace("last_name", '^[[:space:]]+|[[:space:]]+$', '', 'g'), '')`
    );
    expect(migration).toContain("do not invent placeholders");
    expect(migration).toContain('ALTER COLUMN "first_name" DROP NOT NULL');
    expect(migration).toContain('ALTER COLUMN "last_name" DROP NOT NULL');
    expect(migration).toContain("users_compat_fill_name_from_split_fields");
    expect(migration).toContain("BEFORE INSERT OR UPDATE ON \"users\"");
    expect(migration).toContain("users_name_not_blank");
    expect(migration).toContain('ALTER COLUMN "name" SET NOT NULL');

    // Contract cleanup is deferred: expansion must retain split columns + bridge.
    expect(migration).not.toMatch(/DROP COLUMN\s+"first_name"/i);
    expect(migration).not.toMatch(/DROP COLUMN\s+"last_name"/i);
    expect(migration).not.toMatch(/DROP FUNCTION[\s\S]*users_compat_fill_name_from_split_fields/i);
  });

  it("documents explicit outcomes for two-part, single-part, and blank legacy rows", () => {
    const migration = readMigration();

    // Two-part and single-part both come from concat_ws + nullif(regexp_replace(...)).
    expect(migration).toContain("concat_ws(");
    expect(migration).toContain("NULLIF(regexp_replace(");

    // Blank/whitespace-only sources fail closed before NOT NULL.
    expect(migration).toMatch(
      /RAISE EXCEPTION[\s\S]*blank backfilled names[\s\S]*do not invent placeholders/i
    );
    expect(migration).toContain('ALTER COLUMN "name" SET NOT NULL');
  });

  it("rejects tabs, newlines, and other whitespace-only values consistently with the no-blank contract", () => {
    const migration = readMigration();

    // Outer trim and blank detection must use POSIX [[:space:]], not plain TRIM.
    expect(migration).toContain("^[[:space:]]+|[[:space:]]+$");
    expect(migration).toContain('"name" ~ \'^[[:space:]]*$\'');
    expect(migration).toContain('CHECK ("name" !~ \'^[[:space:]]*$\')');

    // Document that plain TRIM is insufficient for tabs/newlines.
    expect(migration).toContain("TRIM()/btrim() is intentionally avoided");
    expect(migration).toContain("tabs,");
    expect(migration).toContain("newlines");

    // Explicit name-only writes remain preserved after outer whitespace trim.
    expect(migration).toContain("New writer supplies name");
    expect(migration).toContain("explicit name write");
    expect(migration).toContain("NEW.\"name\" IS NOT DISTINCT FROM OLD.\"name\"");
  });

  it("preserves explicit name-only writes while bridging old split-field writers", () => {
    const migration = readMigration();

    expect(migration).toContain("Old writer omits name");
    expect(migration).toContain("New writer supplies name");
    expect(migration).toContain("NEW.\"name\" IS NOT DISTINCT FROM OLD.\"name\"");
    expect(migration).toContain("explicit name write");
    expect(migration).toContain("TG_OP = 'INSERT'");
  });

  it("does not touch roles, account state, profiles, enrollments, rosters, or FKs", () => {
    const migration = readMigration();

    expect(migration).not.toMatch(/ALTER TABLE\s+"(?!users")/i);
    expect(migration).not.toContain("user_roles");
    expect(migration).not.toContain("student_academic_profiles");
    expect(migration).not.toContain("student_enrollments");
    expect(migration).not.toContain("course_assignment");
    expect(migration).not.toContain("FOREIGN KEY");
    expect(migration).not.toContain("is_active");
  });
});

describe("canonical user name contract cleanup migration", () => {
  it("removes only the temporary bridge and legacy split columns", () => {
    expect(existsSync(CONTRACT_MIGRATION_PATH)).toBe(true);

    const migration = readContractMigration();

    expect(migration).toContain("users_name_not_blank");
    expect(migration).toContain("users_compat_fill_name_from_split_fields");
    expect(migration).toMatch(/DROP COLUMN "first_name"[\s\S]*DROP COLUMN "last_name"/i);
    expect(migration).not.toMatch(/DROP TABLE|DROP SCHEMA|DROP POLICY|DROP TYPE/i);
    expect(migration).not.toMatch(/DROP COLUMN\s+"(?!first_name|last_name)/i);
    expect(migration).not.toMatch(/ALTER TABLE\s+"(?!users")/i);
    expect(migration).not.toMatch(/DELETE FROM|TRUNCATE|UPDATE\s+|INSERT INTO/i);
  });

  it("fails closed unless the required canonical contract is already present", () => {
    const migration = readContractMigration();

    expect(migration).toContain("users.name must exist and be NOT NULL");
    expect(migration).toContain(
      "users.name must retain the users_name_not_blank constraint"
    );
    expect(migration).toContain(
      "users.name contains NULL or whitespace-only values"
    );
    expect(migration).toContain("legacy split name columns are already absent");
  });
});

describe("canonical user name Prisma application seam", () => {
  it("exposes required name and omits split fields from the User model", () => {
    const userModel = extractUserModelBlock(readUserModel());

    expect(userModel).toMatch(/^\s*name\s+String\s*$/m);
    expect(userModel).not.toMatch(/^\s*first_name\s+/m);
    expect(userModel).not.toMatch(/^\s*last_name\s+/m);
    expect(userModel).not.toMatch(/^\s*name\s+String\?/m);
  });
});

describe("canonical user name generated schema assertions", () => {
  it("exposes required name on the generated Prisma Client User scalar map", async () => {
    // Prisma Client is regenerated locally from the schema datamodel and does
    // not require a linked Supabase push.
    const { Prisma } = await import("@prisma/client");
    const userFields = Prisma.UserScalarFieldEnum;

    expect(userFields).toHaveProperty("name", "name");
    expect(userFields).not.toHaveProperty("first_name");
    expect(userFields).not.toHaveProperty("last_name");
  });

  it("documents the Supabase generated-type contract without hand-edits", () => {
    expect(existsSync(GENERATED_TYPES_PATH)).toBe(true);
    const types = readFileSync(path.join(process.cwd(), GENERATED_TYPES_PATH), "utf8");
    const usersTable = extractUsersTableTypes(types);

    const hasRequiredName = /Row:\s*\{[\s\S]*?\bname:\s*string\b/.test(usersTable);
    const hasNullableName = /Row:\s*\{[\s\S]*?\bname:\s*string\s*\|\s*null\b/.test(
      usersTable
    );

    expect(hasRequiredName).toBe(true);
    expect(hasNullableName).toBe(false);
    expect(usersTable).not.toMatch(/\bfirst_name\s*:/);
    expect(usersTable).not.toMatch(/\blast_name\s*:/);
  });
});
