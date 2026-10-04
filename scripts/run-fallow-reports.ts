import type { SpawnSyncReturns } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  captureFallowReport,
  DEFAULT_FALLOW_OUT_DIR,
  resolveFallowBin,
  signalDetail,
  stderrDetail,
} from "./lib/fallow-runner";

const REPORT_COMMANDS = ["dead-code", "dupes", "health", "flags"] as const;

// 0 and 1 are completed report states: findings belong in the artifacts, not
// in the runner's exit status.
const COMPLETED_REPORT_STATUSES = new Set([0, 1]);

function fail(message: string): never {
  throw new Error(message);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const outDir = process.env.FALLOW_REPORTS_OUT_DIR ?? DEFAULT_FALLOW_OUT_DIR;
    mkdirSync(outDir, { recursive: true });

    for (const command of REPORT_COMMANDS) {
      for (const format of ["json", "sarif"] as const) {
        const stalePath = join(outDir, `${command}.${format}`);
        try {
          rmSync(stalePath, { force: true });
        } catch {
          // tolerate unremovable paths; the capture step reports them
        }
      }
    }

    const fallowBin = resolveFallowBin();

    const failures: string[] = [];

    for (const command of REPORT_COMMANDS) {
      const jsonPath = join(outDir, `${command}.json`);
      const sarifPath = join(outDir, `${command}.sarif`);

      let jsonRun: SpawnSyncReturns<string>;
      try {
        jsonRun = captureFallowReport(
          fallowBin,
          [command, "--format", "json", "--quiet"],
          jsonPath
        );
      } catch (error) {
        failures.push(
          `could not capture fallow ${command} json report at ${jsonPath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        continue;
      }
      if (jsonRun.error) {
        failures.push(`could not start fallow ${command} report: ${jsonRun.error.message}`);
        continue;
      }
      if (!COMPLETED_REPORT_STATUSES.has(jsonRun.status ?? -1)) {
        failures.push(
          `fallow ${command} report returned exit code ${String(jsonRun.status)}${signalDetail(jsonRun)}${stderrDetail(jsonRun)}`
        );
        continue;
      }

      let sarifRun: SpawnSyncReturns<string>;
      try {
        sarifRun = captureFallowReport(
          fallowBin,
          [command, "--format", "sarif", "--quiet"],
          sarifPath
        );
      } catch (error) {
        failures.push(
          `could not capture fallow ${command} sarif report at ${sarifPath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        continue;
      }
      if (sarifRun.error) {
        failures.push(`could not start fallow ${command} sarif capture: ${sarifRun.error.message}`);
        continue;
      }
      if (!COMPLETED_REPORT_STATUSES.has(sarifRun.status ?? -1)) {
        failures.push(
          `fallow ${command} sarif capture returned exit code ${String(sarifRun.status)}${signalDetail(sarifRun)}${stderrDetail(sarifRun)}`
        );
      }
    }

    if (failures.length > 0) {
      fail(failures.join("\n"));
    }
  } catch (error) {
    process.stderr.write(
      `run-fallow-reports: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 2;
  }
}
