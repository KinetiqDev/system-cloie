import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: "pipe" }).trim();
}

function collect(cmd, target) {
  const out = run(cmd);
  if (out)
    out
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((f) => target.add(f));
}

export function getBaseRef() {
  if (process.env.BASE_SHA && process.env.BASE_SHA.trim()) return process.env.BASE_SHA.trim();
  try {
    run("git rev-parse --verify origin/main");
    return "origin/main";
  } catch {
    try {
      run("git rev-parse --verify HEAD~1");
      return "HEAD~1";
    } catch {
      return null;
    }
  }
}

export function getChangedFiles(baseRef) {
  const committed = new Set();
  const working = new Set();

  if (baseRef) {
    collect(`git diff --name-only --diff-filter=ACDMRT ${baseRef}...HEAD`, committed);
  }
  collect("git diff --name-only --diff-filter=ACDMRT HEAD", working);
  collect("git diff --cached --name-only --diff-filter=ACDMRT", working);
  collect("git ls-files --others --exclude-standard", working);

  const combined = [...new Set([...committed, ...working])];
  if (combined.length === 0) {
    // Push to main: no PR base, no working tree changes – diff against previous commit.
    collect("git diff --name-only --diff-filter=ACDMRT HEAD~1...HEAD", combined);
  }
  return combined;
}

/**
 * Keep only paths that still exist on disk. getChangedFiles deliberately
 * collects Git's D status so risk selection expands gates on deletions,
 * but content tools (Prettier, ESLint) exit 2 when handed a path that
 * no longer exists.
 */
export function existingFiles(paths) {
  return paths.filter((f) => existsSync(f));
}

export function runCheck(label, cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.error) {
    console.error(`[${label}] Failed to run ${cmd}: ${result.error.message}`);
    process.exit(2);
  }
  if (result.signal) {
    console.error(`[${label}] ${cmd} terminated with signal ${result.signal}`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}
