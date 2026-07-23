import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

function parenthesesOutsideSqlStrings(sql: string) {
  let depth = 0;
  let insideString = false;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];

    if (character === "'") {
      if (insideString && sql[index + 1] === "'") {
        index += 1;
      } else {
        insideString = !insideString;
      }
      continue;
    }

    if (insideString) {
      continue;
    }

    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
    }
  }

  return depth;
}

describe("course-bound evaluation publication migration", () => {
  it("keeps exclusions scoped, audited, and protected by the roster lock", async () => {
    const migration = await readFile(
      path.join(
        process.cwd(),
        "supabase/migrations/20260721120156_course_bound_evaluation_publication_integrity.sql"
      ),
      "utf8"
    );

    expect(migration).toContain(
      'FOREIGN KEY ("course_bound_evaluation_id", "course_assignment_id")'
    );
    expect(migration).toContain(
      'FOREIGN KEY ("course_assignment_membership_id", "course_assignment_id")'
    );
    expect(migration).toContain('FOREIGN KEY ("excluded_by") REFERENCES "users"("id")');
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("Course-assignment roster is locked after evaluation publication");
    expect(migration).toContain("disciplinary|discipline");

    const reversalMigration = await readFile(
      path.join(
        process.cwd(),
        "supabase/migrations/20260722085916_late_include_course_bound_evaluation_reversal.sql"
      ),
      "utf8"
    );
    expect(reversalMigration).toContain('"reversal_category"');
    expect(reversalMigration).toContain('"reversed_by"');
    expect(reversalMigration).toContain('"reversed_at"');
    expect(reversalMigration).toContain("reversal_check");
    expect(reversalMigration).toContain('FOREIGN KEY ("reversed_by") REFERENCES "users"("id")');
    expect(parenthesesOutsideSqlStrings(reversalMigration)).toBe(0);

    const rosterFoundationMigration = await readFile(
      path.join(
        process.cwd(),
        "supabase/migrations/20260720103341_course_assignment_roster_foundation.sql"
      ),
      "utf8"
    );
    expect(rosterFoundationMigration).toContain(
      'CREATE UNIQUE INDEX "evaluation_assignments_course_bound_respondent_key"'
    );
  });
});
