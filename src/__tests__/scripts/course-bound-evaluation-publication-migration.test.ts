import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("course-bound evaluation publication migration", () => {
  it("keeps exclusions scoped, audited, and protected by the roster lock", async () => {
    const migration = await readFile(
      path.join(
        process.cwd(),
        "supabase/migrations/20260721120156_course_bound_evaluation_publication_integrity.sql"
      ),
      "utf8"
    );

    expect(migration).toContain('FOREIGN KEY ("course_bound_evaluation_id", "course_assignment_id")');
    expect(migration).toContain('FOREIGN KEY ("course_assignment_membership_id", "course_assignment_id")');
    expect(migration).toContain('FOREIGN KEY ("excluded_by") REFERENCES "users"("id")');
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("Course-assignment roster is locked after evaluation publication");
    expect(migration).toContain("disciplinary|discipline");
  });
});
