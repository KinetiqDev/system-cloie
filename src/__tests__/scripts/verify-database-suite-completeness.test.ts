import { describe, expect, it } from "vitest";
import { evaluateCompleteness } from "../../../scripts/verify-database-suite-completeness";

const REQUIRED_SUITE =
  "src/__tests__/features/course-assignments/course-seed-provenance-schema.test.ts";

const NINE_DISCOVERED_SUITES = [
  REQUIRED_SUITE,
  "a.test.ts",
  "b.test.ts",
  "c.test.ts",
  "d.test.ts",
  "e.test.ts",
  "f.test.ts",
  "g.test.ts",
  "h.test.ts",
];

describe("verify-database-suite-completeness helpers (539)", () => {
  it("passes when suites include required gated suites and no orphans", () => {
    const { failure, warnings } = evaluateCompleteness(NINE_DISCOVERED_SUITES, []);

    expect(failure).toBeNull();
    expect(warnings).toEqual([]);
  });

  it("fails when orphans exist", () => {
    const { failure } = evaluateCompleteness(["a.test.ts"], ["orphan.test.ts"]);

    expect(failure?.headline).toMatch(/fall outside the database command convention/);
    expect(failure?.items).toEqual(["orphan.test.ts"]);
    expect(failure?.hint).toMatch(/describe\.skipIf/);
  });

  it("fails when required suites missing", () => {
    const { failure } = evaluateCompleteness(["a.test.ts"], []);

    expect(failure?.headline).toMatch(/required suites not discovered/);
    expect(failure?.items).toEqual([REQUIRED_SUITE]);
  });

  it("warns without failing when the discovered count is below the minimum", () => {
    const { failure, warnings } = evaluateCompleteness([REQUIRED_SUITE], []);

    expect(failure).toBeNull();
    expect(warnings).toEqual(["Completeness warning: expected at least 9 database suites, got 1."]);
  });

  it("prefers the orphan failure over the count warning", () => {
    const { failure, warnings } = evaluateCompleteness([REQUIRED_SUITE], ["orphan.test.ts"]);

    expect(failure?.headline).toMatch(/fall outside the database command convention/);
    expect(warnings).toEqual([]);
  });
});
