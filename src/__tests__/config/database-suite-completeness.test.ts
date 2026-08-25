import { describe, expect, it } from "vitest";
import { discoverDatabaseSuites, getDatabaseSuiteCompleteness } from "../../../scripts/lib/database-suite-discovery";

describe("database suite completeness (539)", () => {
  it("discovers every database-gated suite via the repository convention", () => {
    const { suites, orphans } = getDatabaseSuiteCompleteness();

    // If a gated suite falls outside the convention (e.g. gated with
    // RUN_DATABASE_INTEGRATION_TESTS but not using describe.skipIf), orphans
    // will be non-empty and the test fails with actionable output.
    expect(
      orphans,
      `gated suites fall outside the database command convention: ${orphans.join(", ")}`
    ).toEqual([]);

    // Ensure discovery finds the expected suites (at least the canonical 9)
    expect(suites.length).toBeGreaterThanOrEqual(9);
  });

  it("includes the previously omitted curriculum and course-seed suites", () => {
    const suites = discoverDatabaseSuites();

    expect(suites).toContain(
      "src/__tests__/features/curriculum/curriculum-version-program-major-pairing.test.ts"
    );
    expect(suites).toContain(
      "src/__tests__/features/course-assignments/course-seed-provenance-schema.test.ts"
    );
  });

  it("selects database suites by convention, not a hand-maintained list", async () => {
    const pkg = (await import("../../../package.json", { with: { type: "json" } }) as unknown as { default: { scripts: Record<string, string> } }).default;
    // package.json test:db must delegate to the discovery script, not list files
    const testDb = pkg.scripts["test:db"] ?? "";
    expect(testDb).toContain("run-database-tests");
    expect(testDb).not.toMatch(/course-assignment-membership-constraints/);
  });
});
