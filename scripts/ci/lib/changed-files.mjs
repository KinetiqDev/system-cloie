import { execSync, spawnSync } from "node:child_process";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: "pipe" }).trim();
}

// fallow-ignore-next-line complexity
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

// fallow-ignore-next-line complexity
export function getChangedFiles(baseRef) {
  const committed = new Set();
  const working = new Set();

  function collect(cmd, target) {
    try {
      const out = run(cmd);
      if (out)
        out
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((f) => target.add(f));
    } catch {}
  }

  if (baseRef) {
    collect(`git diff --name-only --diff-filter=ACMRT ${baseRef}...HEAD`, committed);
  }
  collect("git diff --name-only --diff-filter=ACMRT HEAD", working);
  collect("git diff --cached --name-only --diff-filter=ACMRT", working);
  collect("git ls-files --others --exclude-standard", working);

  return [...new Set([...committed, ...working])];
}

export function runCheck(label, cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.error) {
    console.error(`[${label}] Failed to run ${cmd}: ${result.error.message}`);
    process.exit(2);
  }
  process.exit(result.status ?? 0);
}
