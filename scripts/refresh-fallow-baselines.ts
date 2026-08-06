import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

const SCHEMA_VERSION = 4;
const FALLOW_VERSION = "2.54.3";

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
  FALLOW_BIN      Path to the fallow binary (internal test seam)

Guards:
  - the checkout must be a git worktree on main, not a detached HEAD
  - git status must be clean, ignoring nothing (tracked and untracked)
  - an 'origin' remote must exist and origin/main must be fetchable
  - HEAD must match origin/main (neither behind nor ahead)

Transaction:
  all three analyzers run into a staging directory; every output is validated
  (schema/version identity and baseline structure) before any tracked baseline
  is replaced. Any failure removes the staging output and leaves every prior
  baseline byte-for-byte unchanged.

Exit codes:
  0  baselines refreshed
  1  guard, analyzer, or validation failure`;

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
    fail(`refuse to refresh baselines: could not run ${description} in ${cwd}: ${child.error.message}`);
  }
  if (child.status !== 0) {
    const detail = child.stderr.trim() || child.stdout.trim();
    fail(`refuse to refresh baselines: ${description} failed in ${cwd}${detail ? `: ${detail}` : ""}`);
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
    fail(
      `fallow '${command}' failed validation: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function refreshBaselines(root: string): void {
  const fallowBin = resolveFallowBin();
  assertCleanUpToDateMain(root);

  const baselinesDir = join(root, "fallow-baselines");
  mkdirSync(baselinesDir, { recursive: true });
  const stagingDir = mkdtempSync(join(baselinesDir, ".staging-"));

  try {
    for (const analyzer of ANALYZERS) {
      runAnalyzer(fallowBin, root, stagingDir, analyzer);
      console.log(`PASS fallow ${analyzer.command} produced ${analyzer.file}`);
    }

    for (const analyzer of ANALYZERS) {
      renameSync(join(stagingDir, analyzer.file), join(baselinesDir, analyzer.file));
    }
    rmSync(stagingDir, { recursive: true, force: true });
  } catch (error) {
    rmSync(stagingDir, { recursive: true, force: true });
    throw error;
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
    if (!existsSync(root) || !statSync(root).isDirectory()) {
      fail(`--root '${root}' is not a directory`);
    }
    refreshBaselines(root);
  } catch (error) {
    console.error(error instanceof Error ? error.message : `baseline refresh failed: ${String(error)}`);
    process.exitCode = 1;
  }
}