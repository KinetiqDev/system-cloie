/**
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { verifyDemoResetGate } from "../../../scripts/ci/verify-demo-reset-gate";

// js-yaml is not a root dependency; resolve it through eslint's pinned
// @eslint/eslintrc dependency so the workflow YAML is parsed with a lockfile
// version rather than a newly installed one.
const rootRequire = createRequire(import.meta.url);
const eslintRequire = createRequire(rootRequire.resolve("eslint/package.json"));
const eslintrcRequire = createRequire(eslintRequire.resolve("@eslint/eslintrc/package.json"));
const yaml = eslintrcRequire("js-yaml") as { load: (source: string) => unknown };

interface WorkflowStep {
  name?: string;
  run?: string;
  env?: Record<string, string>;
  if?: string;
  with?: Record<string, unknown>;
}
interface WorkflowJob {
  name?: string;
  "timeout-minutes"?: number;
  needs?: string | string[];
  if?: string;
  outputs?: Record<string, string>;
  env?: Record<string, string>;
  steps?: WorkflowStep[];
  services?: Record<string, unknown>;
}
interface Workflow {
  name: string;
  on: Record<string, unknown>;
  jobs: Record<string, WorkflowJob>;
}

function readWorkflow(fileName: string): Workflow {
  const source = readFileSync(join(process.cwd(), ".depot", "workflows", fileName), "utf8");
  return yaml.load(source) as Workflow;
}

function readPlaywrightConfig(): string {
  return readFileSync(join(process.cwd(), "playwright.config.ts"), "utf8");
}

const CI = "ci.yml";
const SCHEDULED = "scheduled.yml";
const SELECT_OUTPUT_KEYS = ["run_build", "run_database", "run_browser", "run_visual"] as const;

describe("risk-based PR CI selection (551)", () => {
  const ci = () => readWorkflow(CI);

  it("classifies changed files through a select job that exposes the check outputs", () => {
    const select = ci().jobs.select;
    expect(select, "select job must exist").toBeDefined();
    expect(select?.["timeout-minutes"]).toBeGreaterThan(0);
    for (const key of SELECT_OUTPUT_KEYS) {
      expect(select?.outputs?.[key]).toBe(`\${{ steps.select.outputs.${key} }}`);
    }
    const selectStep = select?.steps?.find(
      (step) => step.name === "Select checks from changed risk domains"
    );
    expect(selectStep?.run).toContain("node scripts/ci/select-checks.mjs");
  });

  it("always runs the quality job (formatting, lint, repository-owned tests)", () => {
    const quality = ci().jobs["quality-checks"];
    expect(quality?.if).toBeUndefined();
    expect(quality?.needs).toBeUndefined();
    const stepNames = (quality?.steps ?? []).map((step) => step.name ?? "");
    expect(stepNames.some((name) => name.startsWith("Check formatting"))).toBe(true);
    expect(stepNames).toContain("Lint");
    expect(stepNames.some((name) => name.startsWith("Lint changed production code"))).toBe(true);
    expect(stepNames.some((name) => name.startsWith("Test"))).toBe(true);
  });

  it("gates the build, database, and browser jobs on the risk outputs", () => {
    const jobs = ci().jobs;
    expect(jobs["production-build"]?.if).toBe("needs.select.outputs.run_build == 'true'");
    expect(jobs["database-integration"]?.if).toBe("needs.select.outputs.run_database == 'true'");
    expect(jobs["browser-e2e"]?.if).toBe("needs.select.outputs.run_browser == 'true'");
    for (const key of ["production-build", "database-integration", "browser-e2e"]) {
      expect(jobs[key]?.needs).toContain("select");
    }
  });

  it("wires the visual gate output into the browser job", () => {
    const browser = ci().jobs["browser-e2e"];
    expect(browser?.env?.CLOIE_E2E_VISUAL).toBe("${{ needs.select.outputs.run_visual }}");
  });

  it("keeps explicit timeouts and failure diagnostics on every job", () => {
    const jobs = ci().jobs;
    for (const [name, job] of Object.entries(jobs)) {
      expect(job["timeout-minutes"], `job ${name} must have a timeout`).toBeGreaterThan(0);
    }
    const browser = jobs["browser-e2e"];
    const artifactSteps = (browser?.steps ?? []).filter((step) =>
      (step.name ?? "").startsWith("Upload Playwright")
    );
    expect(artifactSteps.length).toBe(2);
    for (const step of artifactSteps) {
      expect(step.if).toBe("failure()");
      expect(step.with?.["retention-days"]).toBe(14);
    }
  });
});

describe("scheduled deep verification matrix (551)", () => {
  const scheduled = () => readWorkflow(SCHEDULED);

  it("runs on a bounded nightly schedule and manual dispatch", () => {
    const workflow = scheduled();
    const schedule = workflow.on.schedule as Array<{ cron: string }>;
    expect(schedule?.[0]?.cron).toMatch(/^\d+ \d+ \* \* \*$/);
    expect(workflow.on["workflow_dispatch"]).toBeDefined();
  });

  it("runs the complete matrix in parallel jobs", () => {
    const jobs = scheduled().jobs;
    expect(Object.keys(jobs).sort()).toEqual(
      [
        "browser-chromium",
        "browser-firefox",
        "browser-webkit",
        "database-integration",
        "demo-reset-gate",
        "production-boundary",
        "unit",
      ].sort()
    );
  });

  it("covers the live RLS suite and the curated visual baseline", () => {
    const jobs = scheduled().jobs;
    const dbSteps = jobs["database-integration"]?.steps ?? [];
    expect(dbSteps.some((step) => step.run?.includes("pnpm test:db"))).toBe(true);
    const chromium = jobs["browser-chromium"];
    expect(chromium?.env?.CLOIE_E2E_VISUAL).toBe("true");
    expect(chromium?.env?.CLOIE_E2E_BROWSERS).toBe("chromium");
  });

  it("runs cross-browser jobs without the chromium-only visual baseline", () => {
    const jobs = scheduled().jobs;
    for (const engine of ["firefox", "webkit"]) {
      const job = jobs[`browser-${engine}`];
      expect(job, `cross-browser job for ${engine} must exist`).toBeDefined();
      expect(job?.env?.CLOIE_E2E_BROWSERS).toBe(engine);
      expect(job?.env?.CLOIE_E2E_VISUAL).toBe("false");
      const install = (job?.steps ?? []).find(
        (step) => step.name === "Install Playwright browsers"
      );
      expect(install?.run).toContain(engine);
    }
  });

  it("verifies the production authentication boundary against a production server", () => {
    const steps = scheduled().jobs["production-boundary"]?.steps ?? [];
    const verify = steps.find(
      (step) => step.name === "Verify the production authentication boundary"
    );
    expect(verify?.run).toContain("pnpm verify:production-auth-boundary");
    expect(steps.some((step) => step.run?.includes("pnpm start"))).toBe(true);
  });

  it("proves the demo reset isolation gate without running the destructive reset", () => {
    const workflowSource = readFileSync(
      join(process.cwd(), ".depot", "workflows", SCHEDULED),
      "utf8"
    );
    expect(workflowSource).not.toContain("demo:reset");
    const steps = scheduled().jobs["demo-reset-gate"]?.steps ?? [];
    expect(steps.some((step) => step.run?.includes("scripts/ci/verify-demo-reset-gate.ts"))).toBe(
      true
    );
  });

  it("keeps explicit timeouts and failure diagnostics on every scheduled job", () => {
    const jobs = scheduled().jobs;
    for (const [name, job] of Object.entries(jobs)) {
      expect(job["timeout-minutes"], `job ${name} must have a timeout`).toBeGreaterThan(0);
    }
    for (const engine of ["chromium", "firefox", "webkit"]) {
      const steps = jobs[`browser-${engine}`]?.steps ?? [];
      const artifactSteps = steps.filter((step) =>
        (step.name ?? "").startsWith("Upload Playwright")
      );
      expect(artifactSteps.length, `${engine} must upload diagnostics`).toBe(2);
      for (const step of artifactSteps) {
        expect(step.if).toBe("failure()");
        expect(step.with?.["retention-days"]).toBe(14);
      }
    }
  });
});

describe("Playwright quality gate contract (551)", () => {
  const config = () => readPlaywrightConfig();

  it("keeps required checks free of retries", () => {
    expect(config()).toMatch(/retries:\s*0/);
    expect(config()).not.toMatch(/retries:\s*[1-9]/);
  });

  it("pins the deterministic visual baseline options", () => {
    const source = config();
    expect(source).toContain('animations: "disabled"');
    expect(source).toContain('caret: "hide"');
    expect(source).toContain('stylePath: "e2e/support/visual.css"');
    expect(source).toMatch(/maxDiffPixelRatio:\s*0\.03/);
  });

  it("selects engine projects and the visual gate through environment wiring", () => {
    const source = config();
    expect(source).toContain("CLOIE_E2E_BROWSERS");
    expect(source).toContain('process.env.CLOIE_E2E_VISUAL !== "false"');
    expect(source).toMatch(/grepInvert:\s*includeVisual \? undefined : \/@visual\//);
  });

  it("defines the cross-browser projects for the scheduled matrix", () => {
    const source = config();
    for (const device of ['devices["Desktop Firefox"]', 'devices["Desktop Safari"]']) {
      expect(source).toContain(device);
    }
  });

  it("defers sharding until a measured runtime justifies it", () => {
    // Measured baseline (full suite, serial mutating journeys, workers: 1):
    // see PR #551 evidence. Sharding stays out until that measured runtime
    // no longer fits the PR wall-time target; the config keeps workers: 1.
    expect(readPlaywrightConfig()).toMatch(/workers:\s*1/);
    for (const [fileName, source] of [
      ["playwright.config.ts", readPlaywrightConfig()],
      [CI, readFileSync(join(process.cwd(), ".depot", "workflows", CI), "utf8")],
      [SCHEDULED, readFileSync(join(process.cwd(), ".depot", "workflows", SCHEDULED), "utf8")],
    ] as const) {
      expect(source, `${fileName} must not shard`).not.toMatch(/--shard|shard:\s/);
    }
  });
});

describe("demo reset isolation gate (551)", () => {
  it("refuses shared, primary, and weak-secret targets and admits a valid dedicated demo", () => {
    const result = verifyDemoResetGate();
    expect(result.valid).toBe(true);
    expect(result.failures).toEqual([]);
  });
});
