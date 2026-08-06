import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

const DEFAULT_OUT_DIR = join(process.cwd(), "artifacts", "fallow");

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

function resolveFallowBin(): string {
  const override = process.env.FALLOW_BIN;
  if (override) {
    return override;
  }
  return join(dirname(require.resolve("fallow/package.json")), "bin", "fallow");
}

function signalDetail(child: SpawnSyncReturns<string>): string {
  return child.status === null && child.signal
    ? ` (terminated by signal ${child.signal})`
    : "";
}

function stderrDetail(child: SpawnSyncReturns<string>): string {
  const detail = child.stderr.trim();
  return detail ? `: ${detail}` : "";
}

function readJsonReport(
  path: string,
  child: SpawnSyncReturns<string>,
  label: string
): unknown {
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

    const outDir = process.env.FALLOW_AUDIT_OUT_DIR ?? DEFAULT_OUT_DIR;
    mkdirSync(outDir, { recursive: true });

    const fallowBin = resolveFallowBin();
    if (!existsSync(fallowBin)) {
      fail(`could not find fallow binary at ${fallowBin}`);
    }

    const runAudit = (format: "json" | "sarif", outPath: string) => {
      const outFd = openSync(outPath, "w");
      const child = spawnSync(
        process.execPath,
        [fallowBin, "audit", "--base", baseSha, "--format", format, "--quiet"],
        { stdio: ["ignore", outFd, "pipe"], encoding: "utf8" }
      );
      closeSync(outFd);
      return child;
    };

    const jsonPath = join(outDir, "audit.json");
    const sarifPath = join(outDir, "audit.sarif");

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
