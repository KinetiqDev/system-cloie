import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { ANALYZERS } from "../../../scripts/refresh-fallow-baselines";

const PROJECT_ROOT = process.cwd();

// The real pinned binary, not a stub: this fixture proves fallow's *native*
// identity matching and audit verdict semantics end to end.
const FALLOW_BIN = join(
  dirname(createRequire(import.meta.url).resolve("fallow/package.json")),
  "bin",
  "fallow"
);

const AUDIT_BASELINE_KEYS: Record<string, string> = {
  "dead-code": "deadCodeBaseline",
  health: "healthBaseline",
  dupes: "dupesBaseline",
};

function git(root: string, args: string[]): void {
  const child = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (child.error || child.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${child.stderr}`);
  }
}

function runFallow(root: string, args: string[]): { status: number; stdout: string } {
  const child = spawnSync(process.execPath, [FALLOW_BIN, "-r", root, ...args], {
    cwd: root,
    encoding: "utf8",
    // Full reports on the real repo exceed the default 1 MiB stream buffer
    // (the dupes report is ~3.4 MiB), so the native parse check needs room.
    maxBuffer: 256 * 1024 * 1024,
  });
  expect(child.error).toBeUndefined();
  return { status: child.status ?? -1, stdout: child.stdout };
}

interface AuditFixture {
  work: string;
  baseSha: string;
  cleanup: () => void;
}

// Generates the three identity baselines with the pinned binary and commits
// them as the audit base, returning the baseline commit SHA.
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

// A minimal repository whose only dead-code finding is the unused export
// `orphanExport` in src/unused.ts. The three identity baselines are generated
// with the pinned binary and committed, so every subsequent audit runs
// baseline-backed.
function createAuditFixture(): AuditFixture {
  const base = mkdtempSync(join(tmpdir(), "fallow-baseline-audit-"));
  try {
    git(base, ["init", "-q", "-b", "main", "work"]);
    const work = join(base, "work");
    git(work, ["config", "user.email", "t@t.t"]);
    git(work, ["config", "user.name", "test"]);
    git(work, ["config", "commit.gpgsign", "false"]);
    mkdirSync(join(work, "src"), { recursive: true });
    writeFileSync(
      join(work, "src/index.ts"),
      'import { usedExport } from "./unused";\nconsole.log(usedExport);\n'
    );
    writeFileSync(
      join(work, "src/unused.ts"),
      "export const usedExport = 1;\nexport const orphanExport = 42;\n"
    );
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
      baseSha,
      cleanup: () => rmSync(base, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(base, { recursive: true, force: true });
    throw error;
  }
}

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

// A minimal repository whose only finding is one duplicated block in
// src/a.ts (transformA/transformB).
function createDuplicationAuditFixture(): AuditFixture {
  const base = mkdtempSync(join(tmpdir(), "fallow-duplication-audit-"));
  try {
    git(base, ["init", "-q", "-b", "main", "work"]);
    const work = join(base, "work");
    git(work, ["config", "user.email", "t@t.t"]);
    git(work, ["config", "user.name", "test"]);
    git(work, ["config", "commit.gpgsign", "false"]);
    mkdirSync(join(work, "src"), { recursive: true });
    writeFileSync(
      join(work, "src/index.ts"),
      'import { transformA, transformB } from "./a";\nexport const result = [transformA({}), transformB({})];\n'
    );
    writeFileSync(
      join(work, "src/a.ts"),
      `${duplicatedTransform("transformA")}${duplicatedTransform("transformB")}`
    );
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
      baseSha,
      cleanup: () => rmSync(base, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(base, { recursive: true, force: true });
    throw error;
  }
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

// .fallowrc.json is JSONC (full-line // comments); strip them before parsing.
function parseJsonc(text: string): Record<string, unknown> {
  const withoutComments = text
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
  return JSON.parse(withoutComments) as Record<string, unknown>;
}

describe("fallow baseline-backed audit", () => {
  it("excludes a baseline-matched finding that is preserved in a changed file", () => {
    const fixture = createAuditFixture();
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

      const audit = runFallow(fixture.work, [
        "audit",
        "--base",
        fixture.baseSha,
        "--format",
        "json",
        "--quiet",
      ]);
      expect(audit.status).toBe(0);
      const report = JSON.parse(audit.stdout) as AuditReport;
      expect(report.verdict).toBe("pass");
      expect(report.dead_code.unused_exports).toEqual([]);
    } finally {
      fixture.cleanup();
    }
  });

  it("returns the native audit failure verdict for a distinct unmatched error finding", () => {
    const fixture = createAuditFixture();
    try {
      // The baselined `orphanExport` stays, and a new unused export is added
      // to the same changed file: identity matching must exclude only the
      // known evidence, leaving the unmatched error to fail the audit.
      writeFileSync(
        join(fixture.work, "src/unused.ts"),
        "export const usedExport = 1;\nexport const orphanExport = 42;\nexport const brandNewUnused = 3;\n"
      );
      git(fixture.work, ["add", "-A"]);
      git(fixture.work, ["commit", "-qm", "add an unmatched finding"]);

      const audit = runFallow(fixture.work, [
        "audit",
        "--base",
        fixture.baseSha,
        "--format",
        "json",
        "--quiet",
      ]);
      expect(audit.status).toBe(1);
      const report = JSON.parse(audit.stdout) as AuditReport;
      expect(report.verdict).toBe("fail");
      expect(report.dead_code.unused_exports).toHaveLength(1);
      expect(report.dead_code.unused_exports[0]).toMatchObject({
        path: "src/unused.ts",
        export_name: "brandNewUnused",
      });
    } finally {
      fixture.cleanup();
    }
  });

  it("excludes a baseline-matched clone group but reports a new clone as a warning-only finding", () => {
    const fixture = createDuplicationAuditFixture();
    try {
      // The baselined duplicate block survives in the changed file: identity
      // matching must exclude it from the audit verdict entirely.
      writeFileSync(
        join(fixture.work, "src/a.ts"),
        `${duplicatedTransform("transformA")}${duplicatedTransform("transformB")}// note\n`
      );
      git(fixture.work, ["add", "-A"]);
      git(fixture.work, ["commit", "-qm", "touch the duplicated file"]);

      const matched = runFallow(fixture.work, [
        "audit",
        "--base",
        fixture.baseSha,
        "--format",
        "json",
        "--quiet",
      ]);
      expect(matched.status).toBe(0);
      const matchedReport = JSON.parse(matched.stdout) as AuditReport;
      expect(matchedReport.verdict).toBe("pass");
      expect(matchedReport.duplication?.clone_groups ?? []).toEqual([]);

      // A new disjoint clone group is reported in the artifact, but under the
      // checked-in policy duplication is warning-only: the native verdict
      // stays `warn` with exit 0. Fallow 2.54.3 exposes no error-severity
      // knob for code-duplication (no rule severity, no audit threshold), so
      // this test pins the actual semantics; enforcing new-clone failures is
      // the PR-gate slice's decision.
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

      const unmatched = runFallow(fixture.work, [
        "audit",
        "--base",
        fixture.baseSha,
        "--format",
        "json",
        "--quiet",
      ]);
      expect(unmatched.status).toBe(0);
      const unmatchedReport = JSON.parse(unmatched.stdout) as AuditReport;
      expect(unmatchedReport.verdict).toBe("warn");
      expect(unmatchedReport.duplication?.clone_groups).toHaveLength(1);
      expect(
        unmatchedReport.duplication?.clone_groups[0].instances.map((instance) => instance.file)
      ).toContain("src/y.ts");
    } finally {
      fixture.cleanup();
    }
  });

  it("commits baselines that parse as fallow 2.54.3 outputs and are wired to the audit policy", () => {
    const fallowrc = parseJsonc(readFileSync(join(PROJECT_ROOT, ".fallowrc.json"), "utf8")) as {
      audit: Record<string, string>;
    };
    for (const analyzer of ANALYZERS) {
      const baseline = JSON.parse(
        readFileSync(join(PROJECT_ROOT, "fallow-baselines", analyzer.file), "utf8")
      ) as Record<string, unknown>;
      for (const key of analyzer.requiredKeys) {
        expect(Array.isArray(baseline[key]), `${analyzer.file} must keep '${key}'`).toBe(true);
      }
      expect(fallowrc.audit[AUDIT_BASELINE_KEYS[analyzer.command]]).toBe(
        `fallow-baselines/${analyzer.file}`
      );
    }

    // Native acceptance: `fallow audit` parses every baseline wired in the
    // policy strictly and exits 2 with "failed to parse baseline" when any of
    // them is incompatible. Running it against the committed bytes proves all
    // three parse as fallow 2.54.3 baselines through the real code path.
    const base = mkdtempSync(join(tmpdir(), "fallow-baseline-parse-"));
    try {
      const work = join(base, "work");
      git(base, ["init", "-q", "-b", "main", "work"]);
      git(work, ["config", "user.email", "t@t.t"]);
      git(work, ["config", "user.name", "test"]);
      git(work, ["config", "commit.gpgsign", "false"]);
      mkdirSync(join(work, "src"), { recursive: true });
      mkdirSync(join(work, "fallow-baselines"), { recursive: true });
      writeFileSync(join(work, "src/index.ts"), "export const x = 1;\n");
      writeFileSync(join(work, ".fallowrc.json"), JSON.stringify(fallowrc));
      for (const analyzer of ANALYZERS) {
        writeFileSync(
          join(work, "fallow-baselines", analyzer.file),
          readFileSync(join(PROJECT_ROOT, "fallow-baselines", analyzer.file))
        );
      }
      git(work, ["add", "-A"]);
      git(work, ["commit", "-qm", "init"]);
      writeFileSync(join(work, "src/index.ts"), "export const x = 2;\n");
      git(work, ["add", "-A"]);
      git(work, ["commit", "-qm", "change"]);

      const accepted = runFallow(work, [
        "audit",
        "--base",
        "HEAD~1",
        "--format",
        "json",
        "--quiet",
      ]);
      expect(accepted.status, "committed baselines must parse as fallow baselines").not.toBe(2);

      // Negative control: corrupting one committed baseline must trip the same
      // strict parse, proving the acceptance check above is meaningful.
      writeFileSync(join(work, "fallow-baselines", "dupes.json"), '{"garbage": true}\n');
      const rejected = runFallow(work, [
        "audit",
        "--base",
        "HEAD~1",
        "--format",
        "json",
        "--quiet",
      ]);
      expect(rejected.status).toBe(2);
      expect(rejected.stdout).toContain("failed to parse");
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
