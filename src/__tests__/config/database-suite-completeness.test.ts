import { describe, expect, it } from "vitest";
import { getDatabaseSuiteCompleteness } from "../../../scripts/lib/database-suite-discovery";

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
});
