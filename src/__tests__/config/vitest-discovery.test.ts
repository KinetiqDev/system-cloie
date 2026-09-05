import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import vitestConfig from "../../../vitest.config";

type NamedProject = { test?: { name?: string } };

function readVitestConfig(): string {
  return readFileSync(join(process.cwd(), "vitest.config.ts"), "utf8");
}

function readPackageScripts(): Record<string, string> {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8") as string) as {
    scripts: Record<string, string>;
  };
  return pkg.scripts;
}

function readCiWorkflow(): string {
  return readFileSync(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
}

describe("vitest discovery determinism (537)", () => {
  it("splits Node and DOM suites by file contract", () => {
    const projects = vitestConfig.test?.projects ?? [];
    expect(projects).toHaveLength(2);
    const names = projects.flatMap((project) => {
      if (!project || typeof project !== "object" || !("test" in project)) return [];
      return [(project as NamedProject).test?.name];
    });
    expect(names).toEqual(["node", "dom"]);
  });

  it("keeps repository and generated dependency trees out of discovery", () => {
    const source = readVitestConfig();

    expect(source).toContain(`"**/node_modules/**"`);
    expect(source).toContain(`"**/.opencode/**"`);
    expect(source).toContain(`"**/.next/**"`);
  });

  it("exposes default, related, and tooling integration commands", () => {
    const scripts = readPackageScripts();

    expect(scripts.test).toBe("vitest run");
    expect(scripts["test:related"]).toContain("vitest related");
    expect(scripts["test:tooling-integration"]).toContain("RUN_TOOLING_INTEGRATION_TESTS=1");
  });

  it("keeps pnpm test and CI unit-test command on the same test universe", () => {
    const scripts = readPackageScripts();
    const ci = readCiWorkflow();

    // CI unit shards invoke pnpm test with Vitest's project selector.
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

    expect(source).toContain("discoverDatabaseSuites()");
    expect(source).toContain("RUN_DATABASE_INTEGRATION_TESTS");
    expect(source).toContain("src/**/*.browser.{test,spec}.ts");
  });
});
