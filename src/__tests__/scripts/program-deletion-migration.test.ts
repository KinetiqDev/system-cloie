import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260711090617_restrict_program_deletion.sql";

describe("Program deletion migration", () => {
  it("guards live schema and restricts every direct Program foreign key", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain("column_name = 'bound_program_id'");
    for (const table of [
      "majors",
      "courses",
      "gos",
      "instrument_templates",
      "faculty_program_affiliations",
      "program_head_assignments",
      "course_bound_evaluation_targets",
      "central_deployments",
      "external_stakeholder_invites",
      "industry_partner_profiles",
    ]) {
      expect(migration).toMatch(new RegExp(`ALTER TABLE \\"${table}\\" ADD CONSTRAINT .* ON DELETE RESTRICT`));
    }
    expect(migration).toContain('"instrument_templates_bound_program_id_fkey"');
  });
});
