import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const PROJECT_ROOT = process.cwd();
const SCRIPT = join(PROJECT_ROOT, "scripts/run-fallow-audit.ts");

const BASE_SHA = "0123456789abcdef0123456789abcdef01234567";

const STUB_SCRIPT = `
const fs = require("node:fs");
const args = process.argv.slice(2);
if (process.env.STUB_ARGS_FILE) {
  fs.appendFileSync(process.env.STUB_ARGS_FILE, JSON.stringify(args) + "\\n");
}
if (process.env.STUB_FAIL_STARTUP) {
  fs.writeSync(2, process.env.STUB_FAIL_STARTUP + "\\n");
  process.exit(1);
}
const formatIndex = args.indexOf("--format");
const isSarif = formatIndex >= 0 && args[formatIndex + 1] === "sarif";
const stubExit =
  process.env[isSarif ? "STUB_SARIF_EXIT" : "STUB_JSON_EXIT"] ??
  process.env.STUB_EXIT ??
  "0";
const stubStderr = process.env[isSarif ? "STUB_SARIF_STDERR" : "STUB_JSON_STDERR"] ??
  process.env.STUB_STDERR;
if (stubStderr) {
  fs.writeSync(2, stubStderr + "\\n");
}
if (isSarif) {
  if (process.env.STUB_SARIF_GARBAGE) {
    fs.writeSync(1, "not a sarif report");
  } else {
    fs.writeSync(1, JSON.stringify({ version: "2.1.0", runs: [] }));
  }
} else {
  const report = { verdict: process.env.STUB_VERDICT ?? "pass", total_issues: 0 };
  fs.writeSync(1, JSON.stringify(report));
}
process.exit(Number(stubExit));
`;

interface Workspace {
  base: string;
  out: string;
  stub: string;
  argsFile: string;
  cleanup: () => void;
}

function createWorkspace(): Workspace {
  const base = mkdtempSync(join(tmpdir(), "fallow-audit-runner-"));
  const out = join(base, "artifacts", "fallow");
  const stub = join(base, "stub.cjs");
  writeFileSync(stub, STUB_SCRIPT);
  return {
    base,
    out,
    stub,
    argsFile: join(base, "args.json"),
    cleanup: () => rmSync(base, { recursive: true, force: true }),
  };
}

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

function expectBothArtifacts(out: string): void {
  const json = join(out, "audit.json");
  const sarif = join(out, "audit.sarif");
  expect(existsSync(json)).toBe(true);
  expect(existsSync(sarif)).toBe(true);
  expect(JSON.parse(readFileSync(json, "utf8"))).toMatchObject({
    verdict: "pass",
    total_issues: 0,
  });
  expect(JSON.parse(readFileSync(sarif, "utf8"))).toMatchObject({
    version: "2.1.0",
    runs: [],
  });
}

describe("run fallow audit", () => {
  it("rejects an absent base SHA as a configuration failure", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript([], {
        FALLOW_BIN: workspace.stub,
        FALLOW_AUDIT_OUT_DIR: workspace.out,
        STUB_ARGS_FILE: workspace.argsFile,
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/base SHA/i);
      expect(existsSync(join(workspace.out, "audit.json"))).toBe(false);
      expect(existsSync(join(workspace.out, "audit.sarif"))).toBe(false);
      expect(existsSync(workspace.argsFile)).toBe(false);
    } finally {
      workspace.cleanup();
    }
  });

  it("invokes fallow audit against the base SHA, capturing JSON and SARIF from separate runs and never adding --fail-on-issues, --ci, or --sarif-file", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript([BASE_SHA], {
        FALLOW_BIN: workspace.stub,
        FALLOW_AUDIT_OUT_DIR: workspace.out,
        STUB_ARGS_FILE: workspace.argsFile,
      });
      expect(result.status).toBe(0);
      const calls = readFileSync(workspace.argsFile, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as string[]);
      expect(calls).toHaveLength(2);
      expect(calls[0]).toEqual([
        "audit",
        "--base",
        BASE_SHA,
        "--format",
        "json",
        "--quiet",
      ]);
      expect(calls[1]).toEqual([
        "audit",
        "--base",
        BASE_SHA,
        "--format",
        "sarif",
        "--quiet",
      ]);
      for (const args of calls) {
        expect(args).not.toContain("--fail-on-issues");
        expect(args).not.toContain("--ci");
        expect(args).not.toContain("--sarif-file");
      }
    } finally {
      workspace.cleanup();
    }
  });

  it("retains both artifacts and succeeds when the audit exits 0", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript([BASE_SHA], {
        FALLOW_BIN: workspace.stub,
        FALLOW_AUDIT_OUT_DIR: workspace.out,
        STUB_EXIT: "0",
      });
      expect(result.status).toBe(0);
      expectBothArtifacts(workspace.out);
    } finally {
      workspace.cleanup();
    }
  });

  it("retains both artifacts and fails with exit 1 for unmatched error findings", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript([BASE_SHA], {
        FALLOW_BIN: workspace.stub,
        FALLOW_AUDIT_OUT_DIR: workspace.out,
        STUB_EXIT: "1",
        STUB_VERDICT: "fail",
      });
      expect(result.status).toBe(1);
      const json = join(workspace.out, "audit.json");
      const sarif = join(workspace.out, "audit.sarif");
      expect(existsSync(json)).toBe(true);
      expect(existsSync(sarif)).toBe(true);
      expect(JSON.parse(readFileSync(json, "utf8"))).toMatchObject({ verdict: "fail" });
    } finally {
      workspace.cleanup();
    }
  });

  it("retains the JSON report and fails as an execution failure with exit 2, without starting the SARIF capture", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript([BASE_SHA], {
        FALLOW_BIN: workspace.stub,
        FALLOW_AUDIT_OUT_DIR: workspace.out,
        STUB_ARGS_FILE: workspace.argsFile,
        STUB_JSON_EXIT: "2",
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/exit code 2/);
      const json = join(workspace.out, "audit.json");
      expect(existsSync(json)).toBe(true);
      expect(JSON.parse(readFileSync(json, "utf8"))).toMatchObject({
        verdict: "pass",
        total_issues: 0,
      });
      expect(existsSync(join(workspace.out, "audit.sarif"))).toBe(false);
      const calls = readFileSync(workspace.argsFile, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as string[]);
      expect(calls).toHaveLength(1);
      expect(calls[0]).toContain("json");
    } finally {
      workspace.cleanup();
    }
  });

  it("fails as an execution failure when the SARIF capture exits with an unexpected status, preserving its stderr", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript([BASE_SHA], {
        FALLOW_BIN: workspace.stub,
        FALLOW_AUDIT_OUT_DIR: workspace.out,
        STUB_JSON_EXIT: "0",
        STUB_SARIF_EXIT: "3",
        STUB_SARIF_STDERR: "sarif stub exploded",
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/sarif capture/);
      expect(result.stderr).toMatch(/exit code 3/);
      expect(result.stderr).toMatch(/sarif stub exploded/);
    } finally {
      workspace.cleanup();
    }
  });

  it("fails as an execution failure when the SARIF capture produces an invalid report, preserving its stderr", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript([BASE_SHA], {
        FALLOW_BIN: workspace.stub,
        FALLOW_AUDIT_OUT_DIR: workspace.out,
        STUB_JSON_EXIT: "0",
        STUB_SARIF_GARBAGE: "1",
        STUB_SARIF_STDERR: "sarif serialization failed",
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/invalid report/);
      expect(result.stderr).toMatch(/sarif serialization failed/);
    } finally {
      workspace.cleanup();
    }
  });

  it("fails as an execution failure when the fallow launcher exits 1 without producing a report", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript([BASE_SHA], {
        FALLOW_BIN: workspace.stub,
        FALLOW_AUDIT_OUT_DIR: workspace.out,
        STUB_ARGS_FILE: workspace.argsFile,
        STUB_FAIL_STARTUP: "stub: platform binary missing",
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/stub: platform binary missing/);
      expect(result.stderr).not.toMatch(/unmatched/);
      expect(existsSync(join(workspace.out, "audit.json"))).toBe(true);
    } finally {
      workspace.cleanup();
    }
  });

  it("fails as an execution failure when the fallow launcher is missing", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript([BASE_SHA], {
        FALLOW_BIN: join(workspace.base, "missing.cjs"),
        FALLOW_AUDIT_OUT_DIR: workspace.out,
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/could not (start|find)/i);
    } finally {
      workspace.cleanup();
    }
  });

  it("fails as an execution failure on an unexpected exit status, keeping its stderr detail", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript([BASE_SHA], {
        FALLOW_BIN: workspace.stub,
        FALLOW_AUDIT_OUT_DIR: workspace.out,
        STUB_JSON_EXIT: "3",
        STUB_JSON_STDERR: "stub: unexpected status detail",
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/unexpected exit code 3/);
      expect(result.stderr).toMatch(/stub: unexpected status detail/);
    } finally {
      workspace.cleanup();
    }
  });
});
