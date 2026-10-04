import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { closeSync, existsSync, openSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

export const DEFAULT_FALLOW_OUT_DIR = join(process.cwd(), "artifacts", "fallow");

/**
 * Resolves the project-local fallow launcher, honoring the FALLOW_BIN test seam,
 * and fails when the resolved path does not exist so no caller can spawn a
 * missing binary.
 */
export function resolveFallowBin(): string {
  const override = process.env.FALLOW_BIN;
  const bin = override
    ? override
    : join(dirname(require.resolve("fallow/package.json")), "bin", "fallow");

  if (!existsSync(bin)) {
    throw new Error(`could not find fallow binary at ${bin}`);
  }

  return bin;
}

/**
 * Runs `bin <args>` and writes the report the launcher prints on stdout to
 * `outPath` verbatim: the runner never parses, re-scores, or suppresses a
 * report. `--sarif-file` is a no-op in fallow 2.54.3, so SARIF is captured from
 * stdout instead of being requested as a file.
 */
export function captureFallowReport(
  bin: string,
  args: readonly string[],
  outPath: string
): SpawnSyncReturns<string> {
  const outFd = openSync(outPath, "w");
  try {
    return spawnSync(process.execPath, [bin, ...args], {
      stdio: ["ignore", outFd, "pipe"],
      encoding: "utf8",
    });
  } finally {
    closeSync(outFd);
  }
}

export function signalDetail(child: SpawnSyncReturns<string>): string {
  return child.status === null && child.signal ? ` (terminated by signal ${child.signal})` : "";
}

export function stderrDetail(child: SpawnSyncReturns<string>): string {
  const detail = child.stderr.trim();
  return detail ? `: ${detail}` : "";
}
