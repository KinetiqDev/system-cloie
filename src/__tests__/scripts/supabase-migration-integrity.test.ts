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

  it("cuts over General Education mappings with a reported, scoped deletion and typed backstops", () => {
    const migration = readFileSync(
      "supabase/migrations/20260814090000_introduce_cilo_institutional_outcome_mappings.sql",
      "utf8"
    );

    expect(migration).toContain("BEGIN;");
    expect(migration).toContain("COMMIT;");
    // Preflight reporting before the irreversible deletion.
    expect(migration).toContain("RAISE NOTICE");
    expect(migration).toMatch(/DELETE FROM cilo_mappings[\s\S]*WHERE cilo_id IN \(/);
    expect(migration).toMatch(/course_scope = 'GENERAL_EDUCATION'/);
    expect(migration).not.toMatch(/DELETE FROM "cilos"/);
    expect(migration).not.toMatch(/DELETE FROM "gos"/);
    expect(migration).not.toMatch(/DELETE FROM "institutional_outcomes"/);
    expect(migration).not.toMatch(/DELETE FROM "course_bound_evaluations"/);
    expect(migration).not.toMatch(/DELETE FROM "academic_period_readiness_snapshots"/);
    // Typed mapping table with provenance, uniqueness, and indexes.
    expect(migration).toContain('CREATE TABLE "cilo_institutional_outcome_mappings"');
    expect(migration).toContain('"created_by" UUID NOT NULL');
    expect(migration).toContain('"updated_by" UUID NOT NULL');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "cilo_institutional_outcome_mappings_cilo_id_institutional_outcome_id_key"'
    );
    expect(migration).toMatch(
      /CREATE INDEX "cilo_institutional_outcome_mappings_cilo_id_idx"/
    );
    expect(migration).toMatch(
      /CREATE INDEX "cilo_institutional_outcome_mappings_institutional_outcome_id_idx"/
    );
    expect(migration).toContain(
      'FOREIGN KEY ("cilo_id") REFERENCES "cilos"("id") ON DELETE CASCADE'
    );
    expect(migration).toContain(
      'FOREIGN KEY ("institutional_outcome_id") REFERENCES "institutional_outcomes"("id") ON DELETE RESTRICT'
    );
    // Database integrity backstops reject wrong-layer writes on both relations.
    expect(migration).toContain("enforce_cilo_institutional_outcome_mapping_scope");
    expect(migration).toContain("enforce_cilo_mapping_program_scope");
    expect(migration).toContain(
      "CREATE TRIGGER cilo_institutional_outcome_mappings_scope_check"
    );
    expect(migration).toContain("CREATE TRIGGER cilo_mappings_scope_check");
    // Server-only access.
    expect(migration).toContain(
      'ALTER TABLE "cilo_institutional_outcome_mappings" ENABLE ROW LEVEL SECURITY'
    );
    expect(migration).toContain(
      'REVOKE ALL ON TABLE "cilo_institutional_outcome_mappings" FROM anon, authenticated'
    );
  });

  it("hardens CILO-to-GO integrity with ownership backstops and actor provenance", () => {
    const migration = readFileSync(
      "supabase/migrations/20260814110000_harden_cilo_mapping_integrity.sql",
      "utf8"
    );

    expect(migration).toContain("BEGIN;");
    expect(migration).toContain("COMMIT;");
    // Cross-Program ownership backstop on the Program-specific relation.
    expect(migration).toContain("enforce_cilo_mapping_program_scope");
    expect(migration).toMatch(/go_program_id <> course_program_id/);
    expect(migration).toContain(
      "General Education CILOs map only to Institutional Outcomes"
    );
    expect(migration).toContain("DROP TRIGGER cilo_mappings_scope_check ON cilo_mappings");
    expect(migration).toContain(
      "BEFORE INSERT OR UPDATE OF cilo_id, go_id"
    );
    // Legacy rows stay unattributed; new writes record actors.
    expect(migration).toContain('ADD COLUMN "created_by" UUID');
    expect(migration).toContain('ADD COLUMN "updated_by" UUID');
    expect(migration).toMatch(/"created_by" UUID\s*,/);
    expect(migration).toContain('REFERENCES "users"("id") ON DELETE SET NULL');
    expect(migration).not.toMatch(/DELETE FROM "cilo_mappings"/);
  });

  it("keeps the Program-scope backstop NULL-safe for program-less Courses", () => {
    const migration = readFileSync(
      "supabase/migrations/20260814120000_fix_cilo_mapping_scope_null_safety.sql",
      "utf8"
    );

    expect(migration).toContain("BEGIN;");
    expect(migration).toContain("COMMIT;");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION enforce_cilo_mapping_program_scope()");
    expect(migration).toContain(
      "Program-specific Courses must belong to an Academic Program"
    );
    expect(migration).toContain("go_program_id IS DISTINCT FROM course_program_id");
    expect(migration).not.toContain("go_program_id <> course_program_id");
    // Function replacement only; the trigger binding is untouched.
    expect(migration).not.toContain("CREATE TRIGGER");
    expect(migration).not.toContain("DROP TRIGGER");
  });
});
