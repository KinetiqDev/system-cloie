import { describe, expect, it } from "vitest";
import { evaluateCompleteness } from "../../../scripts/verify-database-suite-completeness";

describe("verify-database-suite-completeness helpers (539)", () => {
  it("passes when suites include required gated suites and no orphans", () => {
    const suites = [
      "src/__tests__/features/course-assignments/course-seed-provenance-schema.test.ts",
      "a.test.ts",
      "b.test.ts",
      "c.test.ts",
      "d.test.ts",
      "e.test.ts",
      "f.test.ts",
      "g.test.ts",
    ];
    const result = evaluateCompleteness(suites, suites, []);
    expect(result.ok).toBe(true);
  });

  it("fails when orphans exist", () => {
    const result = evaluateCompleteness(
      ["a.test.ts"],
      ["a.test.ts", "orphan.test.ts"],
      ["orphan.test.ts"]
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join()).toMatch(/orphan/);
  });

  it("fails when required suites missing", () => {
    const result = evaluateCompleteness(["a.test.ts"], ["a.test.ts"], []);
    expect(result.ok).toBe(false);
    expect(result.errors.join()).toMatch(/required suites missing/);
  });
});
