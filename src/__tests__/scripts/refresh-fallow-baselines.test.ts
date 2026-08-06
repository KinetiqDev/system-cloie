import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ANALYZERS } from "../../../scripts/refresh-fallow-baselines";

const PROJECT_ROOT = process.cwd();
const SCRIPT = join(PROJECT_ROOT, "scripts/refresh-fallow-baselines.ts");

const BASELINE_FILES = ANALYZERS.map((analyzer) => analyzer.file) as Array<
  "dead-code.json" | "health.json" | "dupes.json"
>;

const EXPECTED_KEYS: Record<string, string[]> = Object.fromEntries(
  ANALYZERS.map((analyzer) => [analyzer.file, analyzer.requiredKeys])
);

const STUB_SCRIPT = `
const fs = require("node:fs");
const args = process.argv.slice(2);
let subcommand = "";
let baselinePath = "";
const valueFlags = new Set(["-r", "--format"]);
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--save-baseline") {
    baselinePath = args[i + 1] ?? "";
    i += 1;
    continue;
  }
  if (valueFlags.has(arg)) {
    i += 1;
    continue;
  }
  if (!arg.startsWith("-")) {
    subcommand = arg;
  }
  if (arg.startsWith("--save-baseline=")) {
    baselinePath = arg.slice("--save-baseline=".length);
  }
}
const failOn = process.env.STUB_FAIL_ON;
const mode = process.env.STUB_MODE ?? "ok";
if (subcommand === failOn) {
  if (mode === "exit2") {
    process.stdout.write(JSON.stringify({ error: true, message: "stub failure", exit_code: 2 }));
    process.exit(2);
  }
  fs.writeFileSync(baselinePath, "garbage baseline");
  process.stdout.write("this is not valid json at all");
  process.exit(0);
}
const baselines = {
  "dead-code": {
    unused_files: [],
    unused_exports: [],
    unused_types: [],
    unused_dependencies: [],
    unused_dev_dependencies: [],
    circular_dependencies: [],
    unused_optional_dependencies: [],
    unused_enum_members: [],
    unused_class_members: [],
    unresolved_imports: [],
    unlisted_dependencies: [],
    duplicate_exports: [],
    type_only_dependencies: [],
    test_only_dependencies: [],
    boundary_violations: [],
    stale_suppressions: [],
  },
  health: { runtime_coverage_findings: [], target_keys: [] },
  dupes: { clone_groups: [] },
};
fs.writeFileSync(baselinePath, JSON.stringify(baselines[subcommand], null, 2));
process.stdout.write(JSON.stringify({ schema_version: 4, version: "2.54.3", total_issues: 0 }));
process.exit(0);
`;

interface Fixture {
  work: string;
  base: string;
  withOrigin: boolean;
  cleanup: () => void;
}

function git(root: string, args: string[]): void {
  const child = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (child.error || child.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${child.stderr}`);
  }
}

function createFixture(withOrigin: boolean): Fixture {
  const base = mkdtempSync(join(tmpdir(), "fallow-baseline-refresh-"));
  try {
    if (withOrigin) {
      git(base, ["init", "-q", "--bare", "-b", "main", "origin.git"]);
      git(base, ["clone", "-q", "origin.git", "work"]);
    } else {
      git(base, ["init", "-q", "-b", "main", "work"]);
    }
    const work = join(base, "work");
    git(work, ["config", "user.email", "t@t.t"]);
    git(work, ["config", "user.name", "test"]);
    git(work, ["config", "commit.gpgsign", "false"]);
    mkdirSync(join(work, "src"), { recursive: true });
    writeFileSync(join(work, "src/index.ts"), "export const used = 1;\n");
    writeFileSync(join(work, ".fallowrc.json"), readFileSync(join(PROJECT_ROOT, ".fallowrc.json")));
    git(work, ["add", "-A"]);
    git(work, ["commit", "-qm", "init"]);
    if (withOrigin) {
      git(work, ["push", "-q", "-u", "origin", "main"]);
    }
    return {
      work,
      base,
      withOrigin,
      cleanup: () => rmSync(base, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(base, { recursive: true, force: true });
    throw error;
  }
}

function commitSentinelBaselines(work: string, push: boolean): string {
  mkdirSync(join(work, "fallow-baselines"), { recursive: true });
  const contents: Record<string, string> = {};
  for (const name of BASELINE_FILES) {
    const content = `{"sentinel": "${name}-original"}\n`;
    writeFileSync(join(work, "fallow-baselines", name), content);
    contents[name] = content;
  }
  git(work, ["add", "-A"]);
  git(work, ["commit", "-qm", "sentinel baselines"]);
  if (push) {
    git(work, ["push", "-q", "origin", "main"]);
  }
  return JSON.stringify(contents);
}

function expectBaselinesUnchanged(work: string, snapshot: string): void {
  const expected = JSON.parse(snapshot) as Record<string, string>;
  for (const name of BASELINE_FILES) {
    expect(readFileSync(join(work, "fallow-baselines", name), "utf8")).toBe(expected[name]);
  }
}

function expectNoStagingArtifacts(work: string): void {
  expect(readdirSync(join(work, "fallow-baselines")).sort()).toEqual([...BASELINE_FILES].sort());
}

function runScript(args: string[], env: Record<string, string> = {}): {
  status: number;
  stdout: string;
  stderr: string;
} {
  const child = spawnSync(process.execPath, ["--import", "tsx", SCRIPT, ...args], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  expect(child.error).toBeUndefined();
  return { status: child.status ?? -1, stdout: child.stdout, stderr: child.stderr };
}

describe("refresh fallow baselines", () => {
  it("produces all three schema/version-validated baselines from a clean up-to-date main fixture", () => {
    const fixture = createFixture(true);
    try {
      const result = runScript(["--root", fixture.work]);
      expect(result.status).toBe(0);
      expect(result.stdout + result.stderr).toContain("dead-code.json");
      expect(result.stdout + result.stderr).toContain("health.json");
      expect(result.stdout + result.stderr).toContain("dupes.json");

      for (const name of BASELINE_FILES) {
        const baseline = JSON.parse(
          readFileSync(join(fixture.work, "fallow-baselines", name), "utf8")
        ) as Record<string, unknown>;
        for (const key of EXPECTED_KEYS[name]) {
          expect(Array.isArray(baseline[key])).toBe(true);
        }
      }
      expectNoStagingArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("records only static identifiers in baseline output, never environment values", () => {
    const fixture = createFixture(true);
    try {
      const sentinel = "SENTINEL_ENV_VALUE_9f2c";
      const result = runScript(["--root", fixture.work], { SENTINEL: sentinel });
      expect(result.status).toBe(0);
      for (const name of BASELINE_FILES) {
        expect(readFileSync(join(fixture.work, "fallow-baselines", name), "utf8")).not.toContain(
          sentinel
        );
      }
    } finally {
      fixture.cleanup();
    }
  });

  it("refuses a tracked worktree change before replacing any baseline", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      writeFileSync(join(fixture.work, "src/index.ts"), "export const used = 2;\n");

      const result = runScript(["--root", fixture.work]);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("dirty worktree");
      expectBaselinesUnchanged(fixture.work, snapshot);
      expectNoStagingArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("refuses an untracked worktree change before replacing any baseline", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      writeFileSync(join(fixture.work, "src/untracked.ts"), "export const stray = 1;\n");

      const result = runScript(["--root", fixture.work]);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("dirty worktree");
      expectBaselinesUnchanged(fixture.work, snapshot);
      expectNoStagingArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("refuses a non-main ref before replacing any baseline", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      git(fixture.work, ["checkout", "-qb", "feature/x"]);
      git(fixture.work, ["commit", "-qm", "feature work", "--allow-empty"]);

      const result = runScript(["--root", fixture.work]);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("must be on");
      expectBaselinesUnchanged(fixture.work, snapshot);
      expectNoStagingArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("refuses a checkout that is behind its origin main", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      const other = join(fixture.base, "other");
      git(fixture.work, ["clone", "-q", join(fixture.base, "origin.git"), other]);
      git(other, ["config", "user.email", "t@t.t"]);
      git(other, ["config", "user.name", "test"]);
      git(other, ["config", "commit.gpgsign", "false"]);
      writeFileSync(join(other, "src/other.ts"), "export const other = 2;\n");
      git(other, ["add", "-A"]);
      git(other, ["commit", "-qm", "other work"]);
      git(other, ["push", "-q", "origin", "main"]);

      const result = runScript(["--root", fixture.work]);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("behind origin/main");
      expectBaselinesUnchanged(fixture.work, snapshot);
      expectNoStagingArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("refuses a checkout that is ahead of its origin main", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      git(fixture.work, ["commit", "-qm", "unpushed local work", "--allow-empty"]);

      const result = runScript(["--root", fixture.work]);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("ahead of origin/main");
      expectBaselinesUnchanged(fixture.work, snapshot);
      expectNoStagingArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("refuses a repository without an origin remote", () => {
    const fixture = createFixture(false);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      const result = runScript(["--root", fixture.work]);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("origin");
      expectBaselinesUnchanged(fixture.work, snapshot);
      expectNoStagingArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("preserves every prior baseline when the second analyzer fails and removes temporary output", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      const stub = join(fixture.base, "stub.cjs");
      writeFileSync(stub, STUB_SCRIPT);

      const result = runScript(["--root", fixture.work], {
        FALLOW_BIN: stub,
        STUB_FAIL_ON: "health",
        STUB_MODE: "exit2",
      });
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("health");
      expectBaselinesUnchanged(fixture.work, snapshot);
      expectNoStagingArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("preserves every prior baseline when the third analyzer emits malformed output", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      const stub = join(fixture.base, "stub.cjs");
      writeFileSync(stub, STUB_SCRIPT);

      const result = runScript(["--root", fixture.work], {
        FALLOW_BIN: stub,
        STUB_FAIL_ON: "dupes",
        STUB_MODE: "garbage",
      });
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("dupes");
      expectBaselinesUnchanged(fixture.work, snapshot);
      expectNoStagingArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("prints usage and exits 0 on --help without touching git or the analyzer", () => {
    const base = mkdtempSync(join(tmpdir(), "fallow-baseline-help-"));
    const marker = join(base, "analyzer-invoked");
    const stub = join(base, "stub.cjs");
    writeFileSync(stub, `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "x");\n`);

    const result = runScript(["--root", base, "--help"], { FALLOW_BIN: stub });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain("Usage");
    expect(() => readFileSync(marker, "utf8")).toThrow();

    rmSync(base, { recursive: true, force: true });
  });
});
