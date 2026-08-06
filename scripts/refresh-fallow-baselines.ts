import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

const SCHEMA_VERSION = 4;
const FALLOW_VERSION = "2.54.3";

const BASELINES_DIR_NAME = "fallow-baselines";
const PREVIOUS_DIR_NAME = ".fallow-baselines-previous";
const LOCK_FILE_NAME = ".fallow-baselines.lock";
const STAGING_PREFIX = ".fallow-staging-";

interface AnalyzerSpec {
  command: string;
  file: string;
  requiredKeys: string[];
}

export const ANALYZERS: AnalyzerSpec[] = [
  {
    command: "dead-code",
    file: "dead-code.json",
    requiredKeys: [
      "unused_files",
      "unused_exports",
      "circular_dependencies",
      "unresolved_imports",
      "boundary_violations",
      "stale_suppressions",
    ],
  },
  {
    command: "health",
    file: "health.json",
    requiredKeys: ["runtime_coverage_findings", "target_keys"],
  },
  {
    command: "dupes",
    file: "dupes.json",
    requiredKeys: ["clone_groups"],
  },
];

const USAGE = `Usage: pnpm fallow:baseline [options]

Regenerate the tracked Fallow identity baselines
(fallow-baselines/dead-code.json, health.json, dupes.json) from a clean,
up-to-date main checkout. A maintenance-only command; it never runs
automatically and it never accepts a dirty or behind worktree.

Options:
  --root <dir>    Project root to analyze (default: current directory)
  -h, --help      Print this help and exit without touching git or analyzers

Environment:
  FALLOW_BIN                    Path to the fallow binary (internal test seam)
  FALLOW_PUBLISH_FAILPOINT      'after-park' | 'after-swap' (internal test seam that
                                injects a failure at that publish step)

Guards:
  - the checkout must be a git worktree on main, not a detached HEAD
  - git status must be clean, ignoring nothing (tracked and untracked)
  - an 'origin' remote must exist and origin/main must be fetchable
  - HEAD must match origin/main (neither behind nor ahead)
  - HEAD and the worktree are rechecked immediately before publish
  - transaction paths must not be symbolic links (refused)
  - a single-writer lock (exclusively created, never reclaimed automatically)
    prevents concurrent refreshes; a lock left by a crashed run is refused
    with removal instructions, and the interrupted generation state is healed
    by the next run once the lock is removed

Transaction:
  all three analyzers run into a staging directory; every output is validated
  (schema/version identity and baseline structure) before publication. The
  complete validated generation is then published as one directory swap with an
  explicit commit point: the current fallow-baselines/ generation is parked at
  .fallow-baselines-previous, the staged generation is renamed into
  fallow-baselines/ (the commit point; readers never observe a mixed
  generation, though they may briefly observe none), the installed generation
  is re-validated, and the parked generation is removed. Any failure before the
  commit point restores the previous generation byte-for-byte and removes all
  temporary output. An interruption is healed by the next run (after the
  crashed run's lock is removed), which restores the previous generation or
  completes a fully installed commit. After the commit point, removal of the
  parked generation is deferred cleanup: a failure to delete it is reported as
  a warning and completed by the next run, never as a rollback.

Exit codes:
  0  baselines refreshed
  1  guard, analyzer, validation, or transaction failure`;

function printUsage(): void {
  process.stdout.write(`${USAGE}\n`);
}

function fail(message: string): never {
  throw new Error(message);
}

function runCommand(command: string, args: string[], cwd: string): SpawnSyncReturns<string> {
  return spawnSync(command, args, { cwd, encoding: "utf8" });
}

function requireGitSuccess(
  child: SpawnSyncReturns<string>,
  description: string,
  cwd: string
): string {
  if (child.error) {
    fail(
      `refuse to refresh baselines: could not run ${description} in ${cwd}: ${child.error.message}`
    );
  }
  if (child.status !== 0) {
    const detail = child.stderr.trim() || child.stdout.trim();
    fail(
      `refuse to refresh baselines: ${description} failed in ${cwd}${detail ? `: ${detail}` : ""}`
    );
  }
  return child.stdout.trim();
}

function assertCleanUpToDateMain(root: string): void {
  const worktree = requireGitSuccess(
    runCommand("git", ["rev-parse", "--is-inside-work-tree"], root),
    "git rev-parse",
    root
  );
  if (worktree !== "true") {
    fail(`refuse to refresh baselines: ${root} is not a git worktree`);
  }

  const branchResult = spawnSync("git", ["symbolic-ref", "--short", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  if (branchResult.error || branchResult.status !== 0) {
    fail("refuse to refresh baselines: detached HEAD; checkout main first");
  }
  const branch = branchResult.stdout.trim();
  if (branch !== "main") {
    fail(`refuse to refresh baselines: checkout must be on 'main' (currently '${branch}')`);
  }

  const status = runCommand("git", ["status", "--porcelain"], root);
  if (status.error || status.status !== 0 || status.stdout.trim() !== "") {
    fail(
      "refuse to refresh baselines: dirty worktree; baselines must represent a reviewed clean main state"
    );
  }

  const remote = runCommand("git", ["remote", "get-url", "origin"], root);
  if (remote.error || remote.status !== 0) {
    fail("refuse to refresh baselines: no 'origin' remote to compare against");
  }

  requireGitSuccess(
    runCommand("git", ["fetch", "--quiet", "origin", "main"], root),
    "git fetch origin main",
    root
  );

  const behind = requireGitSuccess(
    runCommand("git", ["rev-list", "--count", "HEAD..origin/main"], root),
    "git rev-list HEAD..origin/main",
    root
  );
  if (behind !== "0") {
    fail(
      `refuse to refresh baselines: ${root} is behind origin/main by ${behind} commit(s); pull an up-to-date main checkout first`
    );
  }
  const ahead = requireGitSuccess(
    runCommand("git", ["rev-list", "--count", "origin/main..HEAD"], root),
    "git rev-list origin/main..HEAD",
    root
  );
  if (ahead !== "0") {
    fail(
      `refuse to refresh baselines: ${root} is ${ahead} commit(s) ahead of origin/main; baselines must represent the pushed remote state`
    );
  }
}

function parseReport(stdout: string): Record<string, unknown> {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start === -1 || end <= start) {
    fail("analyzer did not produce valid JSON output");
  }
  try {
    return JSON.parse(stdout.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    fail("analyzer did not produce valid JSON output");
  }
}

function validateReport(report: Record<string, unknown>): void {
  if (report.schema_version !== SCHEMA_VERSION || report.version !== FALLOW_VERSION) {
    fail(
      `analyzer produced an unexpected schema/version (schema ${String(report.schema_version)}, version ${String(report.version)}); expected ${SCHEMA_VERSION} / ${FALLOW_VERSION}`
    );
  }
}

function validateBaselineFile(baselinePath: string, requiredKeys: string[]): void {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(readFileSync(baselinePath, "utf8")) as Record<string, unknown>;
  } catch {
    fail(`baseline file ${baselinePath} is not valid JSON`);
  }
  for (const key of requiredKeys) {
    if (!Array.isArray(parsed[key])) {
      fail(`baseline file ${baselinePath} is missing required array field '${key}'`);
    }
  }
}

function refuseSymlinkOrNonDirectory(path: string, description: string): void {
  let stats;
  try {
    stats = lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
  if (stats.isSymbolicLink()) {
    fail(`refuse to refresh baselines: ${description} '${path}' must not be a symbolic link`);
  }
  if (!stats.isDirectory()) {
    fail(`refuse to refresh baselines: ${description} '${path}' is not a directory`);
  }
}

function acquireLock(root: string): string {
  const lockFile = join(root, LOCK_FILE_NAME);
  const ownContent = `${process.pid} ${readProcessStartTime(process.pid)} ${randomToken()}\n`;
  try {
    writeFileSync(lockFile, ownContent, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
    // The lock exists. Locks are never reclaimed automatically: a path-based
    // probe-then-replace cannot be made atomic on POSIX, so automatic takeover
    // could displace a live refresh. Refuse with diagnostics and explicit
    // recovery instructions instead.
    let recorded: string;
    try {
      recorded = readFileSync(lockFile, "utf8").trim();
    } catch {
      recorded = "(unreadable)";
    }
    fail(
      `refuse to refresh baselines: another refresh appears to be running (lock '${lockFile}' records '${recorded}'); if no refresh is running, remove the lock file and re-run to recover any interrupted refresh`
    );
  }
  return lockFile;
}

function randomToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readProcessStartTime(pid: number): number {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const afterComm = stat
      .slice(stat.lastIndexOf(")") + 1)
      .trim()
      .split(/\s+/);
    return Number(afterComm[19] ?? 0);
  } catch {
    return 0;
  }
}

function removeOrphanedStagingDirs(root: string): void {
  // Under the exclusive lock, any staging directory present was abandoned by a
  // crashed run (a live run holds the lock), so removal is safe.
  for (const entry of readdirSync(root)) {
    if (entry.startsWith(STAGING_PREFIX)) {
      rmSync(join(root, entry), { recursive: true, force: true });
    }
  }
}

function failpoint(name: string): void {
  if (process.env.FALLOW_PUBLISH_FAILPOINT === name) {
    fail(`injected publish failure at '${name}' (FALLOW_PUBLISH_FAILPOINT test seam)`);
  }
}

function assertStillCleanMain(root: string, headSha: string): void {
  const current = requireGitSuccess(
    runCommand("git", ["rev-parse", "HEAD"], root),
    "git rev-parse HEAD",
    root
  );
  if (current !== headSha) {
    fail(
      "refuse to publish baselines: HEAD moved while the analyzers ran; re-run the refresh on a stable checkout"
    );
  }
  const status = runCommand("git", ["status", "--porcelain"], root);
  if (status.error || status.status !== 0 || status.stdout.trim() !== "") {
    fail(
      "refuse to publish baselines: worktree changed while the analyzers ran; re-run the refresh on a stable checkout"
    );
  }
}

function recoverInterruptedPublish(root: string): void {
  const baselinesDir = join(root, BASELINES_DIR_NAME);
  const previousDir = join(root, PREVIOUS_DIR_NAME);
  if (!existsSync(previousDir)) {
    return;
  }
  refuseSymlinkOrNonDirectory(previousDir, "interrupted refresh state");
  if (existsSync(baselinesDir)) {
    refuseSymlinkOrNonDirectory(baselinesDir, "installed baseline generation");
    try {
      for (const analyzer of ANALYZERS) {
        validateBaselineFile(join(baselinesDir, analyzer.file), analyzer.requiredKeys);
      }
    } catch (error) {
      // The installed generation is invalid (e.g. a previous rollback could not
      // remove it); quarantine it, then restore the known-good parked
      // generation. The quarantine preserves the invalid generation as
      // diagnostic evidence if the restore fails.
      const quarantineDir = join(root, `${BASELINES_DIR_NAME}.invalid`);
      try {
        renameSync(baselinesDir, quarantineDir);
        renameSync(previousDir, baselinesDir);
        rmSync(quarantineDir, { recursive: true, force: true });
      } catch (restoreError) {
        fail(
          `refuse to refresh baselines: interrupted refresh left an invalid installed generation (${error instanceof Error ? error.message : String(error)}) and restoring the previous generation failed (${restoreError instanceof Error ? restoreError.message : String(restoreError)}); inspect '${quarantineDir}' and '${previousDir}' manually`
        );
      }
      console.log(
        "PASS recovered an interrupted refresh: restored the previous baseline generation"
      );
      return;
    }
    rmSync(previousDir, { recursive: true, force: true });
    console.log(
      "PASS recovered an interrupted refresh: completed a fully installed baseline generation"
    );
    return;
  }
  renameSync(previousDir, baselinesDir);
  console.log("PASS recovered an interrupted refresh: restored the previous baseline generation");
}

function publishGeneration(stagingDir: string, baselinesDir: string, previousDir: string): void {
  const hadPrevious = existsSync(baselinesDir);
  if (hadPrevious) {
    renameSync(baselinesDir, previousDir);
  }
  failpoint("after-park");
  renameSync(stagingDir, baselinesDir);
  failpoint("after-swap");
  try {
    for (const analyzer of ANALYZERS) {
      validateBaselineFile(join(baselinesDir, analyzer.file), analyzer.requiredKeys);
    }
  } catch (error) {
    try {
      if (hadPrevious) {
        const quarantineDir = join(dirname(baselinesDir), `${BASELINES_DIR_NAME}.invalid`);
        renameSync(baselinesDir, quarantineDir);
        renameSync(previousDir, baselinesDir);
        rmSync(quarantineDir, { recursive: true, force: true });
      } else {
        rmSync(baselinesDir, { recursive: true, force: true });
      }
    } catch (rollbackError) {
      const combined = new Error(
        `baseline refresh failed: ${error instanceof Error ? error.message : String(error)}; restoring the previous generation also failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
      );
      (combined as { rollbackIncomplete?: boolean }).rollbackIncomplete = true;
      throw combined;
    }
    throw error;
  }
  if (hadPrevious) {
    try {
      rmSync(previousDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(
        `WARN could not remove the previous generation '${previousDir}' (${error instanceof Error ? error.message : String(error)}); it will be cleaned up by the next refresh`
      );
    }
  }
}

function rollbackFailedPublish(
  baselinesDir: string,
  previousDir: string,
  stagingDir: string,
  originalError: unknown
): never {
  try {
    if (existsSync(previousDir)) {
      if (existsSync(baselinesDir)) {
        if ((originalError as { rollbackIncomplete?: boolean }).rollbackIncomplete) {
          // The invalid generation could not be removed; the parked generation is
          // the only known-good copy. Leave both in place for manual recovery.
          console.warn(
            `WARN refusing to delete the parked generation '${previousDir}': the installed generation could not be rolled back; inspect both directories manually`
          );
        } else {
          // The commit point passed: the new generation is installed and
          // reader-visible. Complete the commit by dropping the parked generation.
          rmSync(previousDir, { recursive: true, force: true });
        }
      } else {
        // The commit point never passed: restore the previous generation.
        renameSync(previousDir, baselinesDir);
      }
    }
  } catch (rollbackError) {
    throw new Error(
      `baseline refresh failed: ${originalError instanceof Error ? originalError.message : String(originalError)}; rollback also failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
    );
  } finally {
    try {
      rmSync(stagingDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn(
        `WARN could not remove the staging directory '${stagingDir}' (${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}); it will be cleaned up by the next refresh`
      );
    }
  }
  throw originalError;
}

function resolveFallowBin(): string {
  const override = process.env.FALLOW_BIN;
  if (override) {
    return override;
  }
  return join(dirname(require.resolve("fallow/package.json")), "bin", "fallow");
}

function runAnalyzer(
  fallowBin: string,
  root: string,
  stagingDir: string,
  analyzer: AnalyzerSpec
): void {
  const { command, file, requiredKeys } = analyzer;
  const baselinePath = join(stagingDir, file);
  const child = runCommand(
    process.execPath,
    [
      fallowBin,
      "-r",
      root,
      command,
      "--save-baseline",
      baselinePath,
      "--format",
      "json",
      "--quiet",
    ],
    root
  );
  if (child.error) {
    fail(`could not start fallow for '${command}': ${child.error.message}`);
  }
  if (child.status !== 0 && child.status !== 1) {
    const detail = child.stderr.trim() || child.stdout.trim();
    fail(
      `fallow '${command}' returned exit code ${String(child.status)}${detail ? `: ${detail}` : ""}`
    );
  }
  try {
    validateReport(parseReport(child.stdout));
    validateBaselineFile(baselinePath, requiredKeys);
  } catch (error) {
    const detail = child.stderr.trim();
    fail(
      `fallow '${command}' failed validation: ${error instanceof Error ? error.message : String(error)}${detail ? `; stderr: ${detail}` : ""}`
    );
  }
}

function refreshBaselines(root: string): void {
  const fallowBin = resolveFallowBin();
  const baselinesDir = join(root, BASELINES_DIR_NAME);
  const previousDir = join(root, PREVIOUS_DIR_NAME);

  refuseSymlinkOrNonDirectory(baselinesDir, "baselines directory");
  refuseSymlinkOrNonDirectory(previousDir, "recovery directory");

  const lockFile = acquireLock(root);
  try {
    removeOrphanedStagingDirs(root);
    recoverInterruptedPublish(root);

    assertCleanUpToDateMain(root);
    const headSha = requireGitSuccess(
      runCommand("git", ["rev-parse", "HEAD"], root),
      "git rev-parse HEAD",
      root
    );

    const stagingDir = mkdtempSync(join(root, STAGING_PREFIX));

    try {
      for (const analyzer of ANALYZERS) {
        runAnalyzer(fallowBin, root, stagingDir, analyzer);
        console.log(`PASS fallow ${analyzer.command} produced ${analyzer.file}`);
      }

      assertStillCleanMain(root, headSha);
      publishGeneration(stagingDir, baselinesDir, previousDir);
    } catch (error) {
      rollbackFailedPublish(baselinesDir, previousDir, stagingDir, error);
    }
  } finally {
    // The lock is exclusively ours: nothing else ever removes it, so release
    // is unconditional.
    rmSync(lockFile, { force: true });
  }

  console.log("PASS baselines refreshed from a clean, up-to-date main checkout");
}

function parseArgs(argv: string[]): { help: boolean; root: string } {
  let help = false;
  let root = process.cwd();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      help = true;
    } else if (arg === "--root") {
      root = argv[i + 1] ?? "";
      i += 1;
    } else if (arg.startsWith("--root=")) {
      root = arg.slice("--root=".length);
    } else {
      fail(`unknown argument '${arg}'; run with --help for usage`);
    }
  }
  return { help, root };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { help, root } = parseArgs(process.argv.slice(2));
    if (help) {
      printUsage();
      process.exit(0);
    }
    const resolvedRoot = resolve(root);
    if (!existsSync(resolvedRoot) || !statSync(resolvedRoot).isDirectory()) {
      fail(`--root '${root}' is not a directory`);
    }
    refreshBaselines(resolvedRoot);
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : `baseline refresh failed: ${String(error)}`
    );
    process.exitCode = 1;
  }
}
