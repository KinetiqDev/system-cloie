import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

const DEFAULT_OUT_DIR = join(process.cwd(), "artifacts", "fallow");

const REPORT_COMMANDS = ["dead-code", "dupes", "health", "flags"] as const;

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

function isCompletedReport(status: number | null): status is 0 | 1 {
  return status === 0 || status === 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const outDir = process.env.FALLOW_REPORTS_OUT_DIR ?? DEFAULT_OUT_DIR;
    mkdirSync(outDir, { recursive: true });

    const fallowBin = resolveFallowBin();
    if (!existsSync(fallowBin)) {
      fail(`could not find fallow binary at ${fallowBin}`);
    }

    const failures: string[] = [];

    for (const command of REPORT_COMMANDS) {
      const runCapture = (format: "json" | "sarif", outPath: string) => {
        const outFd = openSync(outPath, "w");
        try {
          const child = spawnSync(
            process.execPath,
            [fallowBin, command, "--format", format, "--quiet"],
            { stdio: ["ignore", outFd, "pipe"], encoding: "utf8" }
          );
          return child;
        } finally {
          closeSync(outFd);
        }
      };

      const jsonPath = join(outDir, `${command}.json`);
      const sarifPath = join(outDir, `${command}.sarif`);

      let jsonRun: SpawnSyncReturns<string>;
      try {
        jsonRun = runCapture("json", jsonPath);
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
      if (!isCompletedReport(jsonRun.status)) {
        failures.push(
          `fallow ${command} report returned exit code ${String(jsonRun.status)}${signalDetail(jsonRun)}${stderrDetail(jsonRun)}`
        );
        continue;
      }

      let sarifRun: SpawnSyncReturns<string>;
      try {
        sarifRun = runCapture("sarif", sarifPath);
      } catch (error) {
        failures.push(
          `could not capture fallow ${command} sarif report at ${sarifPath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        continue;
      }
      if (sarifRun.error) {
        failures.push(
          `could not start fallow ${command} sarif capture: ${sarifRun.error.message}`
        );
        continue;
      }
      if (!isCompletedReport(sarifRun.status)) {
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
