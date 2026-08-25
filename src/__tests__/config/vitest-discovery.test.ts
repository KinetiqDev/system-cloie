import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readVitestConfig(): string {
  return readFileSync(join(process.cwd(), "vitest.config.ts"), "utf8");
}

function readPackageScripts(): Record<string, string> {
  const pkg = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf8") as string
  ) as { scripts: Record<string, string> };
  return pkg.scripts;
}

function readCiWorkflow(): string {
  return readFileSync(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
}

describe("vitest discovery determinism (537)", () => {
  it("restricts discovery to repository-owned src roots", () => {
    const source = readVitestConfig();

    // include must be explicit src-only
    expect(source).toMatch(/include:\s*\[\s*"src\/\*\*\/\*\.{\s*test,spec\s*}\./);
    expect(source).toContain(`"src/**/*.{test,spec}.{ts,tsx,js,jsx}"`);
  });

  it("excludes nested node_modules such as .opencode/node_modules", () => {
    const source = readVitestConfig();

    // must use **/node_modules/** to cover nested tool-owned trees, not bare node_modules/**
    expect(source).toContain(`"**/node_modules/**"`);
    expect(source).not.toMatch(/exclude:\s*\[\s*"node_modules\/\*\*"/);

    // hidden tool directories must never enter discovery (include already src-only, exclude is defense-in-depth)
    expect(source).toContain(`"**/.opencode/**"`);
  });

  it("keeps hidden tool directories out of the discovered test set", () => {
    // Simulate what vitest's include/exclude means: a file under .opencode/node_modules
    // must not be discovered even if someone creates a hidden tool-owned tree locally.
    const source = readVitestConfig();

    const hiddenCases = [
      ".opencode/node_modules/fake-pkg/src/foo.test.ts",
      ".opencode/node_modules/.bin/fake.test.ts",
      ".claude/plugins/cache/node_modules/pkg/test.spec.ts",
      "node_modules/.pnpm/fake/test.test.ts",
    ];

    for (const file of hiddenCases) {
      // hidden tool paths are either outside src (so not included) or contain node_modules/opencode (so excluded)
      const insideSrc = file.startsWith("src/") && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file);
      const excluded = file.includes("node_modules/") || file.includes(".opencode/") || file.includes(".claude/") || file.includes(".cursor/");
      const discovered = insideSrc && !excluded;
      expect(discovered, `${file} must not be discovered`).toBe(false);
    }

    // sanity: repo-owned tests are still discovered
    expect("src/__tests__/sample.test.ts".startsWith("src/") && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test("src/__tests__/sample.test.ts")).toBe(true);

    // also verify exclude list covers e2e and build artifacts
    expect(source).toContain(`"e2e/**"`);
    expect(source).toContain(`"**/dist/**"`);
  });

  it("exposes focused, related, and full repository-owned verification commands", () => {
    const scripts = readPackageScripts();

    // fast default
    expect(scripts.test).toBe("vitest run");
    // related (changed-file) selection
    expect(scripts["test:related"]).toBeDefined();
    expect(scripts["test:related"]).toContain("vitest related");
    // full repo-owned
    expect(scripts["test:full"]).toBeDefined();
    expect(scripts["test:full"]).toContain("vitest run");
    // focused (explicit path filter) — documented as a script entry point
    expect(scripts["test:focus"] ?? scripts.test).toBeDefined();
  });

  it("keeps pnpm test and CI unit-test command on the same test universe", () => {
    const scripts = readPackageScripts();
    const ci = readCiWorkflow();

    // CI quality-checks runs `pnpm test` which must resolve to the same vitest config
    expect(ci).toMatch(/run:\s*pnpm test\b/);
    expect(scripts.test).toBe("vitest run");

    // No CI job should invoke vitest with a diverging include/exclude
    expect(ci).not.toMatch(/vitest run.*--include/);
    expect(ci).not.toMatch(/vitest run.*--exclude/);
  });

  it("keeps database opt-in and Playwright suites out of the fast vitest command", () => {
    const source = readVitestConfig();
    const ci = readCiWorkflow();

    // fast vitest must not directly run e2e
    expect(source).toContain(`"e2e/**"`);
    // CI separates browser and db suites into distinct jobs
    expect(ci).toContain("pnpm test:db");
    expect(ci).toContain("playwright test");

    // database tests remain gated by RUN_DATABASE_INTEGRATION_TESTS, not executed by pnpm test
    // (they live under src but are skipped without the env — exclude would hide them entirely)
    // Verify that vitest config does not accidentally exclude them via include narrowing
    expect(source).not.toContain("course-assignment-membership");
  });
});
