import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// js-yaml is not a root dependency; resolve it through eslint's pinned
// @eslint/eslintrc dependency so the workflow YAML is parsed with a lockfile
// version rather than a newly installed one.
const rootRequire = createRequire(import.meta.url);
const eslintRequire = createRequire(rootRequire.resolve("eslint/package.json"));
const eslintrcRequire = createRequire(eslintRequire.resolve("@eslint/eslintrc/package.json"));
const yaml = eslintrcRequire("js-yaml") as { load: (source: string) => unknown };

const WORKFLOW_PATH = join(process.cwd(), ".github", "workflows", "code-intelligence.yml");
const WORKFLOW_SOURCE = readFileSync(WORKFLOW_PATH, "utf8");

interface Workflow {
  name: string;
  on: {
    pull_request?: { branches?: string[] };
  };
  permissions: Record<string, string>;
  jobs: Record<
    string,
    {
      name?: string;
      "runs-on": string;
      env?: Record<string, string>;
      steps: Array<Record<string, unknown>>;
    }
  >;
}

function loadWorkflow(): Workflow {
  return yaml.load(WORKFLOW_SOURCE) as Workflow;
}

function jobSteps(): Array<Record<string, unknown>> {
  const workflow = loadWorkflow();
  const jobs = Object.values(workflow.jobs);
  expect(jobs).toHaveLength(1);
  return jobs[0].steps;
}

describe("code-intelligence workflow", () => {
  it("is a least-privilege pull-request gate on main with read-level permissions", () => {
    const workflow = loadWorkflow();

    expect(workflow.on.pull_request).toEqual({ branches: ["main"] });

    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(WORKFLOW_SOURCE).not.toMatch(/write/i);
    expect(WORKFLOW_SOURCE).not.toMatch(/secrets\./);
  });

  it("checks out full history and reuses the pinned pnpm/Node setup", () => {
    const steps = jobSteps();

    const checkout = steps.find((step) => step.uses === "actions/checkout@v4");
    expect(checkout).toBeDefined();
    expect((checkout as { with: Record<string, unknown> }).with).toMatchObject({
      "fetch-depth": 0,
    });

    const pnpmSetup = steps.find((step) => step.uses === "pnpm/action-setup@v3");
    expect((pnpmSetup as { with: Record<string, unknown> }).with).toMatchObject({
      version: "10.30.3",
    });

    const nodeSetup = steps.find((step) => step.uses === "actions/setup-node@v4");
    expect((nodeSetup as { with: Record<string, unknown> }).with).toMatchObject({
      "node-version": "22",
      cache: "pnpm",
    });

    const install = steps.find((step) => step.run === "pnpm install --frozen-lockfile");
    expect(install).toBeDefined();
  });

  it("runs the audit against the pull request base SHA and rejects an absent base SHA", () => {
    const steps = jobSteps();

    const auditStep = steps.find((step) =>
      String(step.run ?? "").includes("run-fallow-audit.ts")
    );
    expect(auditStep).toBeDefined();
    expect((auditStep as { env: Record<string, string> }).env).toMatchObject({
      BASE_SHA: "${{ github.event.pull_request.base.sha }}",
    });
    expect(String(auditStep?.run)).toBe(
      'pnpm exec tsx scripts/run-fallow-audit.ts "$BASE_SHA"'
    );

    const guardStep = steps.find(
      (step) => step.if === "github.event.pull_request.base.sha == ''"
    );
    expect(guardStep).toBeDefined();
    expect(String(guardStep?.run)).toBe(
      'echo "missing pull request base SHA" && exit 2'
    );
    expect(guardStep?.name).toMatch(/base SHA/i);
  });

  it("never passes --fail-on-issues or --ci", () => {
    expect(WORKFLOW_SOURCE).not.toContain("--fail-on-issues");
    expect(WORKFLOW_SOURCE).not.toContain("--ci");
  });

  it("uploads the JSON and SARIF artifacts after the audit and before any failure propagates", () => {
    const steps = jobSteps();

    const auditIndex = steps.findIndex((step) =>
      String(step.run ?? "").includes("run-fallow-audit.ts")
    );
    expect(auditIndex).toBeGreaterThanOrEqual(0);

    const upload = steps.find((step) => String(step.uses ?? "").startsWith("actions/upload-artifact@"));
    expect(upload).toBeDefined();
    expect(String(upload?.uses)).toBe("actions/upload-artifact@v4");
    expect(upload?.if).toBe("always()");
    expect(String((upload as { with: Record<string, string> }).with.path)).toContain(
      "artifacts/fallow"
    );

    const uploadIndex = steps.findIndex((step) =>
      String(step.uses ?? "").startsWith("actions/upload-artifact@")
    );
    expect(uploadIndex).toBeGreaterThan(auditIndex);
  });

  it("does not add write permissions, comments, code scanning, or third-party actions", () => {
    const steps = jobSteps();

    const allowedUses = new Set([
      "actions/checkout@v4",
      "pnpm/action-setup@v3",
      "actions/setup-node@v4",
      "actions/upload-artifact@v4",
    ]);
    for (const step of steps) {
      const uses = String(step.uses ?? "");
      if (uses) {
        expect(allowedUses.has(uses)).toBe(true);
      }
    }
    expect(steps.some((step) => String(step.run ?? "").includes("gh pr comment"))).toBe(false);
    expect(WORKFLOW_SOURCE).not.toMatch(/security-events/);
    expect(WORKFLOW_SOURCE).not.toMatch(/codeql|github\/code-scanning/i);
  });
});
