import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const supersededMigrations = [
  ["20260509172232_add_student_enrollments.sql", "20260510013000_add_student_enrollments.sql"],
  ["20260509172305_add_student_enrollments.sql", "20260510013000_add_student_enrollments.sql"],
  [
    "20260510031840_link_course_bound_eval_to_term.sql",
    "20260510020000_link_entities_to_term_instances.sql",
  ],
  [
    "20260510083223_link_central_deployment_to_term.sql",
    "20260510020000_link_entities_to_term_instances.sql",
  ],
  [
    "20260510092035_backfill_term_instance_ids.sql",
    "20260510020000_link_entities_to_term_instances.sql",
  ],
  [
    "20260510170000_backfill_term_instance_ids.sql",
    "20260510020000_link_entities_to_term_instances.sql",
  ],
  [
    "20260510171000_drop_legacy_academic_year_columns.sql",
    "20260510020000_link_entities_to_term_instances.sql",
  ],
] as const;

describe("Supabase migration integrity", () => {
  it("keeps the legacy GO order migration safe after the initial schema creates the column", () => {
    const migration = readFileSync("supabase/migrations/20260430095333_name.sql", "utf8");

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "order" integer NOT NULL DEFAULT 0');
  });

  it.each(supersededMigrations)("keeps superseded migration %s replay-safe", (filename) => {
    const migration = readFileSync(`supabase/migrations/${filename}`, "utf8");

    expect(migration).toContain("Superseded snapshot");
    expect(migration).not.toContain("CREATE TABLE");
    expect(migration).not.toContain("ALTER TABLE");
  });

  it.each(supersededMigrations)(
    "keeps canonical replacement %s available in the migration history",
    (_supersededFilename, replacementFilename) => {
      expect(existsSync(`supabase/migrations/${replacementFilename}`)).toBe(true);
    }
  );

  it("keeps the canonical replacement migrations responsible for the superseded schema work", () => {
    expect(
      readFileSync(
        "supabase/migrations/20260510003018_add_school_year_and_term_instance.sql",
        "utf8"
      )
    ).toContain('CREATE TABLE "school_years"');
    expect(
      readFileSync("supabase/migrations/20260510013000_add_student_enrollments.sql", "utf8")
    ).toContain('CREATE TABLE "student_enrollments"');
    expect(
      readFileSync("supabase/migrations/20260510013500_add_course_assignments.sql", "utf8")
    ).toContain('CREATE TABLE "course_assignments"');
    expect(
      readFileSync("supabase/migrations/20260510020000_link_entities_to_term_instances.sql", "utf8")
    ).toContain('ALTER TABLE "course_bound_evaluations"');
  });

  it("introduces a catalog-only institutional_outcomes table with server-only writes", () => {
    const migration = readFileSync(
      "supabase/migrations/20260813192638_introduce_institutional_outcome_catalog.sql",
      "utf8"
    );

    expect(migration).toContain("BEGIN;");
    expect(migration).toContain("COMMIT;");
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "institutional_outcomes"');
    expect(migration).toContain('"id" UUID NOT NULL DEFAULT gen_random_uuid()');
    expect(migration).toContain('"code" TEXT NOT NULL');
    expect(migration).toContain('"description" TEXT NOT NULL');
    expect(migration).toContain('"order" INTEGER NOT NULL DEFAULT 0');
    expect(migration).toContain('"is_active" BOOLEAN NOT NULL DEFAULT true');
    expect(migration).toContain('"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP');
    expect(migration).toContain('"updated_at" TIMESTAMP(3) NOT NULL');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "institutional_outcomes_code_key"'
    );
    expect(migration).toContain('ALTER TABLE "institutional_outcomes" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain(
      'REVOKE ALL ON TABLE "institutional_outcomes" FROM anon, authenticated'
    );
    expect(migration).not.toContain("cilo_institutional_outcome_mappings");
    expect(migration).not.toContain("CILOInstitutionalOutcomeMapping");
    expect(migration).not.toMatch(/DELETE FROM\s+"cilo_mappings"/i);
    expect(migration).not.toMatch(/DROP TABLE\s+"gos"/i);
    expect(migration).not.toMatch(/DROP TABLE\s+"cilo_mappings"/i);
    expect(migration).not.toContain("academic_period_readiness_snapshots");
  });
});
