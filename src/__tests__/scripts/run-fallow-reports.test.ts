import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const PROJECT_ROOT = process.cwd();
const SCRIPT = join(PROJECT_ROOT, "scripts/run-fallow-reports.ts");

const REPORT_COMMANDS = ["dead-code", "dupes", "health", "flags"] as const;

const STUB_SCRIPT = `
const fs = require("node:fs");
const args = process.argv.slice(2);
if (process.env.STUB_ARGS_FILE) {
  fs.appendFileSync(process.env.STUB_ARGS_FILE, JSON.stringify(args) + "\\n");
}
if (process.env.STUB_FAIL_STARTUP) {
  fs.writeSync(2, process.env.STUB_FAIL_STARTUP + "\\n");
  process.exit(Number(process.env.STUB_STARTUP_EXIT ?? "2"));
}
if (process.env.STUB_SIGNAL_COMMAND && args[0] === process.env.STUB_SIGNAL_COMMAND) {
  process.kill(process.pid, process.env.STUB_SIGNAL ?? "SIGTERM");
}
if (process.env.STUB_FAIL_COMMAND && args[0] === process.env.STUB_FAIL_COMMAND) {
  fs.writeSync(2, (process.env.STUB_FAIL_COMMAND_STDERR ?? "stub command failed") + "\\n");
  process.exit(Number(process.env.STUB_FAIL_COMMAND_EXIT ?? "2"));
}
const formatIndex = args.indexOf("--format");
const isSarif = formatIndex >= 0 && args[formatIndex + 1] === "sarif";
const stubExit =
  process.env[isSarif ? "STUB_SARIF_EXIT" : "STUB_JSON_EXIT"] ??
  process.env.STUB_EXIT ??
  "0";
const stubStderr = process.env.STUB_STDERR;
if (stubStderr) {
  fs.writeSync(2, stubStderr + "\\n");
}
if (isSarif) {
  fs.writeSync(1, JSON.stringify({ version: "2.1.0", runs: [] }));
} else {
  fs.writeSync(1, JSON.stringify({ command: args[0], format: "json" }));
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
  const base = mkdtempSync(join(tmpdir(), "fallow-reports-runner-"));
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

function runScript(env: Record<string, string> = {}): {
  status: number;
  stdout: string;
  stderr: string;
} {
  const child = spawnSync(process.execPath, ["--import", "tsx", SCRIPT], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  expect(child.error).toBeUndefined();
  return { status: child.status ?? -1, stdout: child.stdout, stderr: child.stderr };
}

function reportPath(out: string, command: string, format: "json" | "sarif"): string {
  return join(out, `${command}.${format}`);
}

function expectJsonArtifact(out: string, command: string): void {
  const path = reportPath(out, command, "json");
  expect(existsSync(path), `${command}.json should exist`).toBe(true);
  expect(JSON.parse(readFileSync(path, "utf8"))).toMatchObject({
    command,
    format: "json",
  });
}

function expectSarifArtifact(out: string, command: string): void {
  const path = reportPath(out, command, "sarif");
  expect(existsSync(path), `${command}.sarif should exist`).toBe(true);
  expect(JSON.parse(readFileSync(path, "utf8"))).toMatchObject({
    version: "2.1.0",
    runs: [],
  });
}

function expectReportSet(out: string): void {
  for (const command of REPORT_COMMANDS) {
    expectJsonArtifact(out, command);
    expectSarifArtifact(out, command);
  }
}

describe("run fallow reports", () => {
  it("invokes each report command twice (JSON and SARIF), never --sarif-file, --fail-on-issues, --ci, or fix", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript({
        FALLOW_BIN: workspace.stub,
        FALLOW_REPORTS_OUT_DIR: workspace.out,
        STUB_ARGS_FILE: workspace.argsFile,
      });
      expect(result.status).toBe(0);
      const calls = readFileSync(workspace.argsFile, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as string[]);
      expect(calls).toHaveLength(REPORT_COMMANDS.length * 2);
      for (const command of REPORT_COMMANDS) {
        expect(calls).toContainEqual([command, "--format", "json", "--quiet"]);
        expect(calls).toContainEqual([command, "--format", "sarif", "--quiet"]);
      }
      for (const args of calls) {
        expect(args).not.toContain("--sarif-file");
        expect(args).not.toContain("--fail-on-issues");
        expect(args).not.toContain("--ci");
        expect(args[0]).not.toBe("fix");
      }
    } finally {
      workspace.cleanup();
    }
  });

  it("retains every JSON and SARIF artifact and exits 0 when every report command exits 0", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript({
        FALLOW_BIN: workspace.stub,
        FALLOW_REPORTS_OUT_DIR: workspace.out,
        STUB_EXIT: "0",
      });
      expect(result.status).toBe(0);
      expectReportSet(workspace.out);
    } finally {
      workspace.cleanup();
    }
  });

  it("retains every artifact and exits 0 when report commands complete with findings exit 1", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript({
        FALLOW_BIN: workspace.stub,
        FALLOW_REPORTS_OUT_DIR: workspace.out,
        STUB_EXIT: "1",
      });
      expect(result.status).toBe(0);
      expectReportSet(workspace.out);
    } finally {
      workspace.cleanup();
    }
  });

  it("fails with exit 2 when a report command exits 2, retaining its JSON and the completed reports", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript({
        FALLOW_BIN: workspace.stub,
        FALLOW_REPORTS_OUT_DIR: workspace.out,
        STUB_ARGS_FILE: workspace.argsFile,
        STUB_FAIL_COMMAND: "dead-code",
        STUB_FAIL_COMMAND_STDERR: "invalid config: bad zone",
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/dead-code/);
      expect(result.stderr).toMatch(/invalid config: bad zone/);
      expect(existsSync(reportPath(workspace.out, "dead-code", "json"))).toBe(true);
      expect(existsSync(reportPath(workspace.out, "dead-code", "sarif"))).toBe(false);
      for (const command of ["dupes", "health", "flags"] as const) {
        expectJsonArtifact(workspace.out, command);
        expectSarifArtifact(workspace.out, command);
      }
      const calls = readFileSync(workspace.argsFile, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as string[]);
      const deadCodeCalls = calls.filter((args) => args[0] === "dead-code");
      expect(deadCodeCalls).toHaveLength(1);
      expect(deadCodeCalls[0]).toContain("json");
    } finally {
      workspace.cleanup();
    }
  });

  it("fails with exit 2 on an unexpected exit status, preserving its stderr detail", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript({
        FALLOW_BIN: workspace.stub,
        FALLOW_REPORTS_OUT_DIR: workspace.out,
        STUB_JSON_EXIT: "3",
        STUB_STDERR: "stub: unexpected status detail",
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/exit code 3/);
      expect(result.stderr).toMatch(/stub: unexpected status detail/);
      for (const command of REPORT_COMMANDS) {
        expect(existsSync(reportPath(workspace.out, command, "json"))).toBe(true);
        expect(existsSync(reportPath(workspace.out, command, "sarif"))).toBe(false);
      }
    } finally {
      workspace.cleanup();
    }
  });

  it("fails with exit 2 when the SARIF capture exits unexpectedly, retaining the JSON and SARIF files it wrote", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript({
        FALLOW_BIN: workspace.stub,
        FALLOW_REPORTS_OUT_DIR: workspace.out,
        STUB_JSON_EXIT: "0",
        STUB_SARIF_EXIT: "3",
        STUB_STDERR: "stub: sarif serialization failed",
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/sarif/);
      expect(result.stderr).toMatch(/exit code 3/);
      expect(result.stderr).toMatch(/stub: sarif serialization failed/);
      for (const command of REPORT_COMMANDS) {
        expect(existsSync(reportPath(workspace.out, command, "json"))).toBe(true);
        expect(existsSync(reportPath(workspace.out, command, "sarif"))).toBe(true);
      }
    } finally {
      workspace.cleanup();
    }
  });

  it("fails with exit 2 when the fallow launcher fails at startup, retaining the JSON files it opened", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript({
        FALLOW_BIN: workspace.stub,
        FALLOW_REPORTS_OUT_DIR: workspace.out,
        STUB_FAIL_STARTUP: "stub: platform binary missing",
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/stub: platform binary missing/);
      for (const command of REPORT_COMMANDS) {
        expect(existsSync(reportPath(workspace.out, command, "json"))).toBe(true);
        expect(existsSync(reportPath(workspace.out, command, "sarif"))).toBe(false);
      }
    } finally {
      workspace.cleanup();
    }
  });

  it("fails with exit 2 when the fallow binary is missing", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript({
        FALLOW_BIN: join(workspace.base, "missing.cjs"),
        FALLOW_REPORTS_OUT_DIR: workspace.out,
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/could not find fallow binary/i);
      for (const command of REPORT_COMMANDS) {
        expect(existsSync(reportPath(workspace.out, command, "json"))).toBe(false);
        expect(existsSync(reportPath(workspace.out, command, "sarif"))).toBe(false);
      }
    } finally {
      workspace.cleanup();
    }
  });

  it("fails with exit 2 when a report command is killed by a signal, retaining its opened JSON and the completed reports", () => {
    const workspace = createWorkspace();
    try {
      const result = runScript({
        FALLOW_BIN: workspace.stub,
        FALLOW_REPORTS_OUT_DIR: workspace.out,
        STUB_ARGS_FILE: workspace.argsFile,
        STUB_SIGNAL_COMMAND: "dead-code",
        STUB_SIGNAL: "SIGTERM",
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/dead-code/);
      expect(result.stderr).toMatch(/SIGTERM/);
      expect(existsSync(reportPath(workspace.out, "dead-code", "json"))).toBe(true);
      expect(existsSync(reportPath(workspace.out, "dead-code", "sarif"))).toBe(false);
      for (const command of ["dupes", "health", "flags"] as const) {
        expectJsonArtifact(workspace.out, command);
        expectSarifArtifact(workspace.out, command);
      }
      const calls = readFileSync(workspace.argsFile, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as string[]);
      const deadCodeCalls = calls.filter((args) => args[0] === "dead-code");
      expect(deadCodeCalls).toHaveLength(1);
      expect(deadCodeCalls[0]).toContain("json");
    } finally {
      workspace.cleanup();
    }
  });

  it("fails with exit 2 when a report output file cannot be opened, continuing with the completed reports", () => {
    const workspace = createWorkspace();
    try {
      mkdirSync(join(workspace.out, "dupes.json"), { recursive: true });
      const result = runScript({
        FALLOW_BIN: workspace.stub,
        FALLOW_REPORTS_OUT_DIR: workspace.out,
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/dupes/);
      expect(result.stderr).toMatch(/dupes\.json/);
      for (const command of ["dead-code", "health", "flags"] as const) {
        expectJsonArtifact(workspace.out, command);
        expectSarifArtifact(workspace.out, command);
      }
      expect(existsSync(reportPath(workspace.out, "dupes", "sarif"))).toBe(false);
    } finally {
      workspace.cleanup();
    }
  });
});

describe("run-fallow-reports script source", () => {
  const SOURCE = readFileSync(SCRIPT, "utf8");

  it("never spawns fallow fix", () => {
    expect(SOURCE).not.toMatch(/"fix"/);
    expect(SOURCE).not.toMatch(/fix --yes/);
    expect(SOURCE).not.toMatch(/fix_apply|fix_preview/);
  });

  it("never reads secrets or credentials", () => {
    const envReads = [...SOURCE.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map(
      (match) => match[1],
    );
    expect(envReads.length).toBeGreaterThan(0);
    expect(new Set(envReads)).toEqual(new Set(["FALLOW_BIN", "FALLOW_REPORTS_OUT_DIR"]));
    expect(SOURCE).not.toMatch(/secret/i);
    expect(SOURCE).not.toMatch(/token|api[_-]?key|DATABASE_URL/i);
  });
});
