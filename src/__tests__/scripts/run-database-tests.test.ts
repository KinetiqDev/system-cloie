import { describe, expect, it } from "vitest";
import { buildVitestArgs } from "../../../scripts/run-database-tests";

describe("run-database-tests helpers (539)", () => {
  it("builds vitest args with --no-file-parallelism for sequential isolation", () => {
    const args = buildVitestArgs(["a.test.ts", "b.test.ts"]);
    expect(args).toEqual(["run", "--no-file-parallelism", "a.test.ts", "b.test.ts"]);
  });

  it("preserves single-file invocation", () => {
    expect(buildVitestArgs(["x.test.ts"])).toEqual(["run", "--no-file-parallelism", "x.test.ts"]);
  });

  it("ensures no-file-parallelism flag is always present", () => {
    // Verifies the sequential/isolation invariant required by 539
    const args = buildVitestArgs([]);
    expect(args).toContain("--no-file-parallelism");
  });
});
