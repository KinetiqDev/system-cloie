import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { ANALYZERS } from "../../../scripts/refresh-fallow-baselines";

const PROJECT_ROOT = process.cwd();
const GATE_SCRIPT = join(PROJECT_ROOT, "scripts", "run-fallow-audit.ts");

// The runner is spawned from inside the fixture (so fallow analyzes the
// fixture repository), which has no node_modules; resolve tsx by absolute
// path instead of the bare `--import tsx` specifier.
const TSX_LOADER = createRequire(import.meta.url).resolve("tsx");

// The real pinned binary, not a stub: this verification runs the production
// CI gate entry point (`scripts/run-fallow-audit.ts`) end to end against a
// controlled fixture whose identity baselines were committed with the same
// binary. It proves the integrated platform distinguishes the warning,
// regression, and execution-error paths through the actual code path the
// pull-request workflow invokes.
const FALLOW_BIN = join(
  dirname(createRequire(import.meta.url).resolve("fallow/package.json")),
  "bin",
  "fallow"
);

function git(root: string, args: string[]): void {
  const child = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (child.error || child.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${child.stderr}`);
  }
}

function runFallow(root: string, args: string[]): { status: number } {
  const child = spawnSync(process.execPath, [FALLOW_BIN, "-r", root, ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  expect(child.error).toBeUndefined();
  return { status: child.status ?? -1 };
}

interface GateFixture {
  work: string;
  outDir: string;
  baseSha: string;
  cleanup: () => void;
}

function installBaselines(work: string): string {
  mkdirSync(join(work, "fallow-baselines"), { recursive: true });
  for (const analyzer of ANALYZERS) {
    const result = runFallow(work, [
      analyzer.command,
      "--save-baseline",
      `fallow-baselines/${analyzer.file}`,
      "--format",
      "json",
      "--quiet",
    ]);
    if (result.status !== 0 && result.status !== 1) {
      throw new Error(`fallow ${analyzer.command} failed with exit ${String(result.status)}`);
    }
  }
  git(work, ["add", "-A"]);
  git(work, ["commit", "-qm", "baselines"]);
  return spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: work,
    encoding: "utf8",
  }).stdout.trim();
}

function createFixture(name: string, sourceFiles: Array<[string, string]>): GateFixture {
  const base = mkdtempSync(join(tmpdir(), `fallow-platform-${name}-`));
  try {
    git(base, ["init", "-q", "-b", "main", "work"]);
    const work = join(base, "work");
    git(work, ["config", "user.email", "t@t.t"]);
    git(work, ["config", "user.name", "test"]);
    git(work, ["config", "commit.gpgsign", "false"]);
    mkdirSync(join(work, "src"), { recursive: true });
    for (const [path, content] of sourceFiles) {
      writeFileSync(join(work, path), content);
    }
    writeFileSync(join(work, ".fallowrc.json"), readFileSync(join(PROJECT_ROOT, ".fallowrc.json")));
    writeFileSync(
      join(work, ".gitignore"),
      "/.fallow\n/.fallow-staging-*\n/.fallow-baselines.lock*\n"
    );
    git(work, ["add", "-A"]);
    git(work, ["commit", "-qm", "init"]);
    const baseSha = installBaselines(work);
    return {
      work,
      outDir: join(base, "artifacts", "fallow"),
      baseSha,
      cleanup: () => rmSync(base, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(base, { recursive: true, force: true });
    throw error;
  }
}

// Runs the production CI gate script exactly as the workflow does, but rooted
// in the fixture so fallow analyzes the fixture repository.
function runGateScript(fixture: GateFixture): {
  status: number;
  stdout: string;
  stderr: string;
} {
  const child = spawnSync(
    process.execPath,
    ["--import", TSX_LOADER, GATE_SCRIPT, fixture.baseSha],
    {
      cwd: fixture.work,
      env: {
        ...process.env,
        FALLOW_BIN,
        FALLOW_AUDIT_OUT_DIR: fixture.outDir,
      },
      encoding: "utf8",
    }
  );
  expect(child.error).toBeUndefined();
  return { status: child.status ?? -1, stdout: child.stdout, stderr: child.stderr };
}

interface AuditReport {
  verdict: string;
  dead_code: {
    unused_exports: Array<{ path: string; export_name: string }>;
  };
  duplication?: {
    clone_groups: Array<{ instances: Array<{ file: string }> }>;
  };
}

interface SarifReport {
  version: string;
  runs: Array<{ results?: Array<unknown> }>;
}

function readAuditJson(fixture: GateFixture): AuditReport {
  return JSON.parse(readFileSync(join(fixture.outDir, "audit.json"), "utf8")) as AuditReport;
}

function readSarif(fixture: GateFixture): SarifReport {
  return JSON.parse(readFileSync(join(fixture.outDir, "audit.sarif"), "utf8")) as SarifReport;
}

function expectValidSarif(fixture: GateFixture): SarifReport {
  const sarif = readSarif(fixture);
  expect(sarif.version).toBe("2.1.0");
  expect(Array.isArray(sarif.runs)).toBe(true);
  return sarif;
}

const UNUSED_SOURCE: Array<[string, string]> = [
  [
    "src/index.ts",
    'import { usedExport } from "./unused";\nconsole.log(usedExport);\n',
  ],
  [
    "src/unused.ts",
    "export const usedExport = 1;\nexport const orphanExport = 42;\n",
  ],
];

// Operator-free body: `??`/`||` chains inflate cyclomatic and cognitive
// complexity, and an unmatched complexity finding would corrupt the
// duplication-only verdict this fixture measures.
const DUPLICATED_BODY = `  const first = payload.first;
  const second = payload.second;
  const third = payload.third;
  const fourth = payload.fourth;
  const fifth = payload.fifth;
  const sixth = payload.sixth;
  const seventh = payload.seventh;
  const eighth = payload.eighth;
  const ninth = payload.ninth;
  const tenth = payload.tenth;
  return { first, second, third, fourth, fifth, sixth, seventh, eighth, ninth, tenth };
`;

function duplicatedTransform(name: string): string {
  return `export function ${name}(payload: Record<string, string>): Record<string, string> {\n${DUPLICATED_BODY}}\n`;
}

const DUPLICATION_SOURCE: Array<[string, string]> = [
  [
    "src/index.ts",
    'import { transformA, transformB } from "./a";\nexport const result = [transformA({}), transformB({})];\n',
  ],
  [
    "src/a.ts",
    `${duplicatedTransform("transformA")}${duplicatedTransform("transformB")}`,
  ],
];

describe("fallow platform verification through the CI gate", () => {
  it("permits a baseline-matched finding preserved in a changed file", () => {
    const fixture = createFixture("matched", UNUSED_SOURCE);
    try {
      // src/unused.ts changes, but the baselined `orphanExport` finding stays.
      writeFileSync(
        join(fixture.work, "src/unused.ts"),
        "export const usedExport = 1;\nexport const orphanExport = 42;\nexport const newlyUsed = 2;\n"
      );
      writeFileSync(
        join(fixture.work, "src/index.ts"),
        'import { usedExport, newlyUsed } from "./unused";\nconsole.log(usedExport, newlyUsed);\n'
      );
      git(fixture.work, ["add", "-A"]);
      git(fixture.work, ["commit", "-qm", "preserve the baseline finding"]);

      const gate = runGateScript(fixture);
      expect(gate.status).toBe(0);
      const report = readAuditJson(fixture);
      expect(report.verdict).toBe("pass");
      expect(report.dead_code.unused_exports).toEqual([]);
      expectValidSarif(fixture);
    } finally {
      fixture.cleanup();
    }
  });

  it("blocks a distinct unmatched error-severity finding, retaining both gate reports", () => {
    const fixture = createFixture("unmatched", UNUSED_SOURCE);
    try {
      // The baselined `orphanExport` stays, and a new unused export is added
      // to the same changed file: identity matching must exclude only the
      // known evidence, leaving the unmatched error to fail the gate.
      writeFileSync(
        join(fixture.work, "src/unused.ts"),
        "export const usedExport = 1;\nexport const orphanExport = 42;\nexport const brandNewUnused = 3;\n"
      );
      git(fixture.work, ["add", "-A"]);
      git(fixture.work, ["commit", "-qm", "add an unmatched finding"]);

      const gate = runGateScript(fixture);
      expect(gate.status).toBe(1);
      const report = readAuditJson(fixture);
      expect(report.verdict).toBe("fail");
      expect(report.dead_code.unused_exports).toHaveLength(1);
      expect(report.dead_code.unused_exports[0]).toMatchObject({
        path: "src/unused.ts",
        export_name: "brandNewUnused",
      });
      const sarif = expectValidSarif(fixture);
      expect(
        sarif.runs.some((run) => (run.results ?? []).length > 0),
        "the failing audit must retain the finding in its SARIF artifact"
      ).toBe(true);
    } finally {
      fixture.cleanup();
    }
  });

  it("permits a warning-only duplication finding while retaining it in the gate artifacts", () => {
    const fixture = createFixture("warning", DUPLICATION_SOURCE);
    try {
      // The baselined duplicate block survives in the changed file: identity
      // matching must exclude it from the gate verdict entirely.
      writeFileSync(
        join(fixture.work, "src/a.ts"),
        `${duplicatedTransform("transformA")}${duplicatedTransform("transformB")}// note\n`
      );
      git(fixture.work, ["add", "-A"]);
      git(fixture.work, ["commit", "-qm", "touch the duplicated file"]);

      const matched = runGateScript(fixture);
      expect(matched.status).toBe(0);
      expect(readAuditJson(fixture).verdict).toBe("pass");

      // A new disjoint clone group is reported in the artifact, but under the
      // checked-in policy duplication is warning-only: the native verdict
      // stays `warn` with exit 0, so the gate succeeds while the warning is
      // retained for review.
      writeFileSync(
        join(fixture.work, "src/y.ts"),
        `${duplicatedTransform("transformY1")}${duplicatedTransform("transformY2")}`
      );
      writeFileSync(
        join(fixture.work, "src/index.ts"),
        'import { transformA, transformB } from "./a";\nimport { transformY1, transformY2 } from "./y";\nexport const result = [transformA({}), transformB({}), transformY1({}), transformY2({})];\n'
      );
      git(fixture.work, ["add", "-A"]);
      git(fixture.work, ["commit", "-qm", "add a new duplicate block"]);

      const unmatched = runGateScript(fixture);
      expect(unmatched.status).toBe(0);
      const report = readAuditJson(fixture);
      expect(report.verdict).toBe("warn");
      expect(report.duplication?.clone_groups).toHaveLength(1);
      expect(
        report.duplication?.clone_groups[0].instances.map((instance) => instance.file)
      ).toContain("src/y.ts");
      const sarif = expectValidSarif(fixture);
      expect(
        sarif.runs.some((run) => (run.results ?? []).length > 0),
        "the warning-only audit must retain the finding in its SARIF artifact"
      ).toBe(true);
    } finally {
      fixture.cleanup();
    }
  });

  it("distinguishes an execution/configuration error from a regression", () => {
    const fixture = createFixture("execution-error", DUPLICATION_SOURCE);
    try {
      // Corrupting one committed baseline must fail the gate as an
      // execution/configuration error (exit 2), never as an unmatched
      // quality-gate regression.
      writeFileSync(join(fixture.work, "fallow-baselines", "dupes.json"), '{"garbage": true}\n');

      const gate = runGateScript(fixture);
      expect(gate.status).toBe(2);
      expect(gate.stderr).toMatch(/exit code 2/);
      expect(gate.stderr).not.toMatch(/unmatched/);
      expect(JSON.parse(readFileSync(join(fixture.outDir, "audit.json"), "utf8"))).toBeDefined();
      expect(
        existsSync(join(fixture.outDir, "audit.sarif")),
        "the sarif capture must not start after an execution failure"
      ).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });
});
