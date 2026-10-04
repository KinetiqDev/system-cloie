import type { SpawnSyncReturns } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  captureFallowReport,
  DEFAULT_FALLOW_OUT_DIR,
  resolveFallowBin,
  signalDetail,
  stderrDetail,
} from "./lib/fallow-runner";

const USAGE = `usage: run-fallow-audit.ts <base-sha>

Runs the project-local baseline-backed fallow audit against the given base
commit SHA. The audit JSON report is written to <out-dir>/audit.json and the
SARIF report to <out-dir>/audit.sarif (default out-dir: artifacts/fallow/).

The audit runs twice: once with --format json (its exit code drives the gate)
and once with --format sarif (its stdout is captured to audit.sarif, because
--sarif-file is a no-op in fallow 2.54.3).

Exit codes:
  0  pass or warning-only result
  1  unmatched error-severity findings (quality gate failure)
  2  execution or configuration failure

Environment:
  FALLOW_BIN              path to the fallow binary (internal test seam)
  FALLOW_AUDIT_OUT_DIR    output directory (internal test seam)
`;

function fail(message: string): never {
  throw new Error(message);
}

function readJsonReport(path: string, child: SpawnSyncReturns<string>, label: string): unknown {
  let parsed: unknown;
  try {
    const content = readFileSync(path, "utf8");
    if (!content.trim()) {
      fail(`${label} produced no output at ${path}`);
    }
    parsed = JSON.parse(content) as unknown;
  } catch (error) {
    fail(
      `${label} produced an invalid report at ${path}: ${
        error instanceof Error ? error.message : String(error)
      }${stderrDetail(child)}`
    );
  }
  return parsed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [baseSha] = process.argv.slice(2);
    if (!baseSha) {
      process.stderr.write(USAGE);
      fail("a base SHA is required");
    }

    const outDir = process.env.FALLOW_AUDIT_OUT_DIR ?? DEFAULT_FALLOW_OUT_DIR;
    mkdirSync(outDir, { recursive: true });

    const fallowBin = resolveFallowBin();

    const jsonPath = join(outDir, "audit.json");
    const sarifPath = join(outDir, "audit.sarif");

    const runAudit = (format: "json" | "sarif", outPath: string) =>
      captureFallowReport(
        fallowBin,
        ["audit", "--base", baseSha, "--format", format, "--quiet"],
        outPath
      );

    const jsonRun = runAudit("json", jsonPath);
    if (jsonRun.error) {
      fail(`could not start fallow audit: ${jsonRun.error.message}`);
    }

    switch (jsonRun.status) {
      case 0:
        break;
      case 1:
        process.exitCode = 1;
        break;
      case 2: {
        const detail = jsonRun.stderr.trim();
        fail(`fallow audit returned exit code 2${detail ? `: ${detail}` : ""}`);
        break;
      }
      default:
        fail(
          `fallow audit returned unexpected exit code ${String(jsonRun.status)}${signalDetail(jsonRun)}${stderrDetail(jsonRun)}`
        );
    }

    readJsonReport(jsonPath, jsonRun, "audit");

    const sarifRun = runAudit("sarif", sarifPath);
    if (sarifRun.error) {
      fail(`could not start fallow audit: ${sarifRun.error.message}`);
    }

    if (sarifRun.status !== 0 && sarifRun.status !== 1) {
      fail(
        `fallow sarif capture returned exit code ${String(sarifRun.status)}${signalDetail(sarifRun)}${stderrDetail(sarifRun)}`
      );
    }

    readJsonReport(sarifPath, sarifRun, "sarif capture");
  } catch (error) {
    process.stderr.write(
      `run-fallow-audit: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 2;
  }
}
