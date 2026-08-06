import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

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
if (mode === "mutate" && subcommand === process.env.STUB_MUTATE_ON) {
  fs.writeFileSync("src/index.ts", "export const used = 999;\\n");
}
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
const report = { schema_version: 4, version: "2.54.3", total_issues: 0 };
if (mode === "big-output") {
  report.pad = "x".repeat(2 * 1024 * 1024);
}
// Synchronous fd write: process.stdout.write can buffer and then get cut off
// by the process.exit below when the payload exceeds the pipe buffer.
fs.writeSync(1, JSON.stringify(report));
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
    writeFileSync(
      join(work, ".gitignore"),
      "/.fallow-staging-*\n/.fallow\n/.fallow-baselines.lock*\n"
    );
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

function expectNoTransactionArtifacts(work: string): void {
  const leftovers = readdirSync(work).filter(
    (name) =>
      name.startsWith(".fallow-staging-") ||
      name === ".fallow-baselines-previous" ||
      name.startsWith(".fallow-baselines.lock")
  );
  expect(leftovers).toEqual([]);
}

// A known-good baseline generation (independent source of truth for tests that
// need a valid installed generation distinct from the committed sentinels).
const VALID_BASELINES: Record<string, Record<string, unknown>> = {
  "dead-code.json": {
    unused_files: [],
    unused_exports: [],
    circular_dependencies: [],
    unresolved_imports: [],
    boundary_violations: [],
    stale_suppressions: [],
  },
  "health.json": { runtime_coverage_findings: [], target_keys: [] },
  "dupes.json": { clone_groups: [] },
};

function runScript(
  args: string[],
  env: Record<string, string> = {}
): {
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

  it("accepts analyzer output larger than the default child-process buffer", () => {
    const fixture = createFixture(true);
    try {
      const stub = join(fixture.base, "stub.cjs");
      writeFileSync(stub, STUB_SCRIPT);

      const result = runScript(["--root", fixture.work], {
        FALLOW_BIN: stub,
        STUB_MODE: "big-output",
      });
      expect(result.status).toBe(0);
      expect(result.stdout + result.stderr).toContain("dead-code.json");
      expect(result.stdout + result.stderr).toContain("health.json");
      expect(result.stdout + result.stderr).toContain("dupes.json");
      expectNoStagingArtifacts(fixture.work);
      expectNoTransactionArtifacts(fixture.work);
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

  it("preserves all three prior baselines when the publish commit point fails after parking the old generation", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      const stub = join(fixture.base, "stub.cjs");
      writeFileSync(stub, STUB_SCRIPT);

      const result = runScript(["--root", fixture.work], {
        FALLOW_BIN: stub,
        FALLOW_PUBLISH_FAILPOINT: "after-park",
      });
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("after-park");
      expectBaselinesUnchanged(fixture.work, snapshot);
      expectNoStagingArtifacts(fixture.work);
      expectNoTransactionArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("keeps the complete new generation when a failure strikes after the commit point", () => {
    const fixture = createFixture(true);
    try {
      commitSentinelBaselines(fixture.work, fixture.withOrigin);
      const stub = join(fixture.base, "stub.cjs");
      writeFileSync(stub, STUB_SCRIPT);

      const result = runScript(["--root", fixture.work], {
        FALLOW_BIN: stub,
        FALLOW_PUBLISH_FAILPOINT: "after-swap",
      });
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("after-swap");
      for (const name of BASELINE_FILES) {
        const baseline = JSON.parse(
          readFileSync(join(fixture.work, "fallow-baselines", name), "utf8")
        ) as Record<string, unknown>;
        for (const key of EXPECTED_KEYS[name]) {
          expect(Array.isArray(baseline[key])).toBe(true);
        }
      }
      expectNoStagingArtifacts(fixture.work);
      expectNoTransactionArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("restores the previous generation when the last refresh was interrupted after parking", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      // Simulate a crash between park and swap: the reader-visible directory is
      // gone and the previous generation is parked.
      rmSync(join(fixture.work, "fallow-baselines"), { recursive: true, force: true });
      const previous = join(fixture.work, ".fallow-baselines-previous");
      mkdirSync(previous, { recursive: true });
      const contents = JSON.parse(snapshot) as Record<string, string>;
      for (const name of BASELINE_FILES) {
        writeFileSync(join(previous, name), contents[name]);
      }

      const stub = join(fixture.base, "stub.cjs");
      writeFileSync(stub, STUB_SCRIPT);
      const result = runScript(["--root", fixture.work], {
        FALLOW_BIN: stub,
        STUB_FAIL_ON: "health",
        STUB_MODE: "exit2",
      });
      expect(result.status).not.toBe(0);
      // Recovery restored the sentinels before the guard; the analyzer failure
      // then aborted the run without touching them.
      expectBaselinesUnchanged(fixture.work, snapshot);
      expectNoStagingArtifacts(fixture.work);
      expectNoTransactionArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("preserves the interrupted state byte-for-byte when a non-main checkout is rejected", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      git(fixture.work, ["checkout", "-qb", "feature/x"]);
      git(fixture.work, ["commit", "-qm", "feature work", "--allow-empty"]);
      // An interrupted refresh state is present, but the checkout is not main:
      // recovery must not mutate anything before the checkout is rejected.
      rmSync(join(fixture.work, "fallow-baselines"), { recursive: true, force: true });
      const previous = join(fixture.work, ".fallow-baselines-previous");
      mkdirSync(previous, { recursive: true });
      const contents = JSON.parse(snapshot) as Record<string, string>;
      for (const name of BASELINE_FILES) {
        writeFileSync(join(previous, name), contents[name]);
      }

      const result = runScript(["--root", fixture.work]);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("must be on");
      // Nothing was healed: the parked generation is still parked and the
      // reader-visible directory is still absent.
      for (const name of BASELINE_FILES) {
        expect(readFileSync(join(previous, name), "utf8")).toBe(contents[name]);
      }
      expect(existsSync(join(fixture.work, "fallow-baselines"))).toBe(false);
      // The refresh lock was released and nothing was staged.
      expect(existsSync(join(fixture.work, ".fallow-baselines.lock"))).toBe(false);
      expect(
        readdirSync(fixture.work).filter((name) => name.startsWith(".fallow-staging-"))
      ).toEqual([]);
    } finally {
      fixture.cleanup();
    }
  });

  it("preserves the interrupted state byte-for-byte when a dirty worktree is rejected", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      // An interrupted refresh state is present together with unrelated
      // dirt: recovery must not mutate anything before the worktree is
      // rejected.
      rmSync(join(fixture.work, "fallow-baselines"), { recursive: true, force: true });
      const previous = join(fixture.work, ".fallow-baselines-previous");
      mkdirSync(previous, { recursive: true });
      const contents = JSON.parse(snapshot) as Record<string, string>;
      for (const name of BASELINE_FILES) {
        writeFileSync(join(previous, name), contents[name]);
      }
      writeFileSync(join(fixture.work, "src/index.ts"), "export const used = 2;\n");
      // A pre-existing orphaned staging directory (from a crashed run) must
      // also survive the rejected invocation byte-for-byte.
      const orphan = join(fixture.work, ".fallow-staging-orphan");
      mkdirSync(orphan, { recursive: true });
      const orphanBytes = '{"orphan": "stage-sentinel"}\n';
      writeFileSync(join(orphan, "dead-code.json"), orphanBytes);

      const result = runScript(["--root", fixture.work]);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("dirty worktree");
      // Nothing was healed or cleaned: the parked generation is still parked,
      // the reader-visible directory is still absent, the orphaned staging
      // directory is untouched, and the unrelated edit survives.
      for (const name of BASELINE_FILES) {
        expect(readFileSync(join(previous, name), "utf8")).toBe(contents[name]);
      }
      expect(existsSync(join(fixture.work, "fallow-baselines"))).toBe(false);
      expect(readFileSync(join(fixture.work, "src/index.ts"), "utf8")).toBe(
        "export const used = 2;\n"
      );
      expect(readFileSync(join(orphan, "dead-code.json"), "utf8")).toBe(orphanBytes);
      // The refresh lock was released and nothing new was staged.
      expect(existsSync(join(fixture.work, ".fallow-baselines.lock"))).toBe(false);
      expect(
        readdirSync(fixture.work).filter((name) => name.startsWith(".fallow-staging-"))
      ).toEqual([".fallow-staging-orphan"]);
    } finally {
      fixture.cleanup();
    }
  });

  it("completes a fully installed generation when the last refresh was interrupted after the swap", () => {
    const fixture = createFixture(true);
    try {
      commitSentinelBaselines(fixture.work, fixture.withOrigin);
      // Simulate a crash between swap and cleanup: a valid new generation is
      // installed and the committed one is parked.
      const baselinesDir = join(fixture.work, "fallow-baselines");
      rmSync(baselinesDir, { recursive: true, force: true });
      mkdirSync(baselinesDir, { recursive: true });
      const newContent: Record<string, string> = {};
      for (const name of BASELINE_FILES) {
        const content = JSON.stringify(VALID_BASELINES[name]);
        writeFileSync(join(baselinesDir, name), content);
        newContent[name] = content;
      }
      const previous = join(fixture.work, ".fallow-baselines-previous");
      mkdirSync(previous, { recursive: true });
      for (const name of BASELINE_FILES) {
        writeFileSync(join(previous, name), `{"sentinel": "${name}-original"}\n`);
      }

      const result = runScript(["--root", fixture.work]);
      // Recovery keeps the installed generation (which no longer matches HEAD),
      // so the guard then refuses the dirty checkout.
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("dirty worktree");
      expect(existsSync(previous)).toBe(false);
      for (const name of BASELINE_FILES) {
        expect(readFileSync(join(fixture.work, "fallow-baselines", name), "utf8")).toBe(
          newContent[name]
        );
      }
    } finally {
      fixture.cleanup();
    }
  });

  it("refuses to publish when the worktree changes while the analyzers run", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      const stub = join(fixture.base, "stub.cjs");
      writeFileSync(stub, STUB_SCRIPT);

      const result = runScript(["--root", fixture.work], {
        FALLOW_BIN: stub,
        STUB_MODE: "mutate",
        STUB_MUTATE_ON: "health",
      });
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("worktree changed");
      expectBaselinesUnchanged(fixture.work, snapshot);
      expectNoStagingArtifacts(fixture.work);
      expectNoTransactionArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("accepts a relative --root and resolves it against the current directory", () => {
    const fixture = createFixture(true);
    try {
      const stub = join(fixture.base, "stub.cjs");
      writeFileSync(stub, STUB_SCRIPT);

      const result = runScript(["--root", relative(PROJECT_ROOT, fixture.work)], {
        FALLOW_BIN: stub,
      });
      expect(result.status).toBe(0);
      expectNoStagingArtifacts(fixture.work);
      expectNoTransactionArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("refuses a symlinked baselines directory even when it is untracked and ignored", () => {
    const fixture = createFixture(true);
    try {
      // First-run fixture: no fallow-baselines is committed, so the symlink is
      // a genuinely untracked transaction path.
      const external = join(fixture.base, "external");
      mkdirSync(external, { recursive: true });
      writeFileSync(join(external, "dead-code.json"), '{"external": true}\n');
      symlinkSync(external, join(fixture.work, "fallow-baselines"), "dir");
      appendFileSync(join(fixture.work, ".git", "info", "exclude"), "\nfallow-baselines\n");
      expect(
        spawnSync("git", ["status", "--porcelain"], {
          cwd: fixture.work,
          encoding: "utf8",
        }).stdout.trim()
      ).toBe("");

      const result = runScript(["--root", fixture.work]);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("symbolic link");
      expect(readFileSync(join(external, "dead-code.json"), "utf8")).toBe('{"external": true}\n');
    } finally {
      fixture.cleanup();
    }
  });

  it("refuses to run when the refresh lock has no readable owner metadata", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      mkdirSync(join(fixture.work, ".fallow-baselines.lock"));

      const result = runScript(["--root", fixture.work]);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("(unreadable)");
      expect(result.stdout + result.stderr).toContain("remove the lock file");
      expectBaselinesUnchanged(fixture.work, snapshot);
    } finally {
      fixture.cleanup();
    }
  });

  it("refuses to run when the refresh lock has invalid owner metadata", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      writeFileSync(join(fixture.work, ".fallow-baselines.lock"), "not-a-pid\n");

      const result = runScript(["--root", fixture.work]);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("not-a-pid");
      expect(result.stdout + result.stderr).toContain("remove the lock file");
      expectBaselinesUnchanged(fixture.work, snapshot);
    } finally {
      fixture.cleanup();
    }
  });

  it("refuses to run when the refresh lock is held by a live process", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      writeFileSync(join(fixture.work, ".fallow-baselines.lock"), "1\n");

      const result = runScript(["--root", fixture.work]);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("another refresh appears to be running");
      expectBaselinesUnchanged(fixture.work, snapshot);
    } finally {
      fixture.cleanup();
    }
  });

  it("refuses to steal a refresh lock held by a live same-user process", () => {
    const fixture = createFixture(true);
    let holder: ReturnType<typeof spawn> | undefined;
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      holder = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], {
        detached: true,
        stdio: "ignore",
      });
      holder.unref();
      expect(holder.pid).toBeDefined();
      const lockContent = `${String(holder.pid)}\n`;
      writeFileSync(join(fixture.work, ".fallow-baselines.lock"), lockContent);

      const result = runScript(["--root", fixture.work]);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("another refresh appears to be running");
      expectBaselinesUnchanged(fixture.work, snapshot);
      // The live lock must not have been stolen or modified.
      expect(readFileSync(join(fixture.work, ".fallow-baselines.lock"), "utf8")).toBe(lockContent);
    } finally {
      if (holder?.pid !== undefined) {
        process.kill(holder.pid, "SIGKILL");
      }
      fixture.cleanup();
    }
  });

  it("refuses a stale lock and, once it is removed, heals the interrupted refresh", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      // Simulate a crash: the parked generation, an orphaned staging directory,
      // and a lock whose owning process is gone.
      const deadChild = spawnSync(process.execPath, ["-e", ""]);
      const deadPid = String(deadChild.pid ?? 0);
      writeFileSync(join(fixture.work, ".fallow-baselines.lock"), `${deadPid}\n`);
      rmSync(join(fixture.work, "fallow-baselines"), { recursive: true, force: true });
      const previous = join(fixture.work, ".fallow-baselines-previous");
      mkdirSync(previous, { recursive: true });
      const contents = JSON.parse(snapshot) as Record<string, string>;
      for (const name of BASELINE_FILES) {
        writeFileSync(join(previous, name), contents[name]);
      }
      mkdirSync(join(fixture.work, ".fallow-staging-orphan"), { recursive: true });
      writeFileSync(join(fixture.work, ".fallow-staging-orphan", "dead-code.json"), "{}");
      const stub = join(fixture.base, "stub.cjs");
      writeFileSync(stub, STUB_SCRIPT);

      // Locks are never reclaimed automatically: the stale lock is refused
      // with diagnostics and the interrupted state stays untouched.
      const refused = runScript(["--root", fixture.work], { FALLOW_BIN: stub });
      expect(refused.status).not.toBe(0);
      expect(refused.stdout + refused.stderr).toContain("lock");
      expect(readFileSync(join(fixture.work, ".fallow-baselines.lock"), "utf8")).toBe(
        `${deadPid}\n`
      );
      // The parked generation is still parked; the reader-visible directory is
      // still absent (the crash state is untouched).
      for (const name of BASELINE_FILES) {
        expect(readFileSync(join(previous, name), "utf8")).toBe(contents[name]);
      }
      expect(existsSync(join(fixture.work, "fallow-baselines"))).toBe(false);
      // The orphaned staging directory is preserved too (nothing is cleaned
      // while the lock is held).
      expect(existsSync(join(fixture.work, ".fallow-staging-orphan"))).toBe(true);

      // After the documented manual removal, the next run heals the state:
      // the parked generation is restored before the guard, then the analyzer
      // failure aborts the run without touching the sentinels.
      rmSync(join(fixture.work, ".fallow-baselines.lock"));
      const result = runScript(["--root", fixture.work], {
        FALLOW_BIN: stub,
        STUB_FAIL_ON: "health",
        STUB_MODE: "exit2",
      });
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("health");
      expectBaselinesUnchanged(fixture.work, snapshot);
      expect(existsSync(join(fixture.work, ".fallow-staging-orphan"))).toBe(false);
      expectNoTransactionArtifacts(fixture.work);
    } finally {
      fixture.cleanup();
    }
  });

  it("preserves both generations when recovery cannot quarantine an invalid installed generation", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      const sentinels = JSON.parse(snapshot) as Record<string, string>;
      const baselinesDir = join(fixture.work, "fallow-baselines");
      for (const name of BASELINE_FILES) {
        writeFileSync(join(baselinesDir, name), '{"invalid": true}\n');
      }
      const previous = join(fixture.work, ".fallow-baselines-previous");
      mkdirSync(previous, { recursive: true });
      for (const name of BASELINE_FILES) {
        writeFileSync(join(previous, name), sentinels[name]);
      }
      // Occupy the quarantine path so the quarantine rename fails.
      mkdirSync(join(fixture.work, "fallow-baselines.invalid"), { recursive: true });
      writeFileSync(join(fixture.work, "fallow-baselines.invalid", "occupied"), "x");

      const result = runScript(["--root", fixture.work]);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("inspect");
      // Both complete generations remain available for manual recovery, and
      // the quarantine path that blocked the restore is untouched.
      for (const name of BASELINE_FILES) {
        expect(readFileSync(join(baselinesDir, name), "utf8")).toBe('{"invalid": true}\n');
        expect(readFileSync(join(previous, name), "utf8")).toBe(sentinels[name]);
      }
      expect(readFileSync(join(fixture.work, "fallow-baselines.invalid", "occupied"), "utf8")).toBe(
        "x"
      );
    } finally {
      fixture.cleanup();
    }
  });

  it("keeps concurrent refreshes from both claiming an existing lock", async () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      const deadChild = spawnSync(process.execPath, ["-e", ""]);
      const lockContent = `${String(deadChild.pid)}\n`;
      writeFileSync(join(fixture.work, ".fallow-baselines.lock"), lockContent);
      const stub = join(fixture.base, "stub.cjs");
      writeFileSync(stub, STUB_SCRIPT);

      // Both children start before either is awaited, so both genuinely race
      // the same pre-existing lock. Since locks are never reclaimed, both must
      // refuse and neither may enter the refresh.
      const runAsync = (): Promise<{ status: number | null; out: string }> =>
        new Promise((resolve) => {
          const child = spawn(
            process.execPath,
            ["--import", "tsx", SCRIPT, "--root", fixture.work],
            {
              cwd: PROJECT_ROOT,
              env: { ...process.env, FALLOW_BIN: stub },
              stdio: "pipe",
            }
          );
          let out = "";
          child.stdout.setEncoding("utf8");
          child.stderr.setEncoding("utf8");
          child.stdout.on("data", (chunk) => {
            out += chunk;
          });
          child.stderr.on("data", (chunk) => {
            out += chunk;
          });
          child.on("close", (code) => resolve({ status: code, out }));
        });
      const [first, second] = await Promise.all([runAsync(), runAsync()]);

      expect(first.status).not.toBe(0);
      expect(second.status).not.toBe(0);
      expect(first.out).toContain("lock");
      expect(second.out).toContain("lock");
      // The pre-existing lock was never stolen or modified.
      expect(readFileSync(join(fixture.work, ".fallow-baselines.lock"), "utf8")).toBe(lockContent);
      expectBaselinesUnchanged(fixture.work, snapshot);
      // No staging or recovery artifacts were created or touched.
      const leftovers = readdirSync(fixture.work).filter(
        (name) => name.startsWith(".fallow-staging-") || name === ".fallow-baselines-previous"
      );
      expect(leftovers).toEqual([]);
    } finally {
      fixture.cleanup();
    }
  });

  it("restores the parked generation when an interrupted refresh left an invalid installed generation", () => {
    const fixture = createFixture(true);
    try {
      const snapshot = commitSentinelBaselines(fixture.work, fixture.withOrigin);
      // Both directories exist: the installed generation is invalid and the
      // parked generation holds the known-good sentinels.
      const baselinesDir = join(fixture.work, "fallow-baselines");
      for (const name of BASELINE_FILES) {
        writeFileSync(join(baselinesDir, name), '{"invalid": true}\n');
      }
      const previous = join(fixture.work, ".fallow-baselines-previous");
      mkdirSync(previous, { recursive: true });
      const contents = JSON.parse(snapshot) as Record<string, string>;
      for (const name of BASELINE_FILES) {
        writeFileSync(join(previous, name), contents[name]);
      }

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
      expectNoTransactionArtifacts(fixture.work);
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
