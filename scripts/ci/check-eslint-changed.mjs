#!/usr/bin/env node
/**
 * Check ESLint warnings in changed production code only.
 *
 * Fails with exit 1 when any changed production file introduces a warning
 * or error. Existing backlog warnings in unchanged files do not affect the
 * result.
 *
 * Production code filter:
 *   - under src/
 *   - .ts/.tsx/.js/.jsx
 *   - excludes __tests__, *.test.*, *.spec.*, *.stories.*
 *   - excludes generated types (src/types/supabase-database.ts)
 *
 * Base detection:
 *   - BASE_SHA env (set by CI from pull_request.base.sha) takes precedence
 *   - else origin/main if available
 *   - else HEAD~1
 */

import { execSync, spawnSync } from "node:child_process";

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", stdio: "pipe", ...opts }).trim();
}

function getBaseRef() {
  if (process.env.BASE_SHA && process.env.BASE_SHA.trim()) {
    return process.env.BASE_SHA.trim();
  }
  // Try origin/main
  try {
    run("git rev-parse --verify origin/main");
    return "origin/main";
  } catch {
    // fallback
  }
  try {
    run("git rev-parse --verify HEAD~1");
    return "HEAD~1";
  } catch {
    return null;
  }
}

function getChangedFiles(baseRef) {
  const committed = new Set();
  const working = new Set();
  if (baseRef) {
    try {
      const range = `${baseRef}...HEAD`;
      const out = run(`git diff --name-only --diff-filter=ACMRT ${range}`);
      if (out)
        out
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((f) => committed.add(f));
    } catch {}
  }
  // Include unstaged and staged working tree changes vs HEAD for local runs
  try {
    const out = run("git diff --name-only --diff-filter=ACMRT HEAD");
    if (out)
      out
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((f) => working.add(f));
  } catch {}
  try {
    const out = run("git diff --cached --name-only --diff-filter=ACMRT");
    if (out)
      out
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((f) => working.add(f));
  } catch {}
  // Also untracked files (new files not yet added) – git ls-files --others
  try {
    const out = run("git ls-files --others --exclude-standard");
    if (out)
      out
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((f) => working.add(f));
  } catch {}
  const combined = new Set([...committed, ...working]);
  return [...combined];
}

function isProductionFile(f) {
  if (!f.startsWith("src/")) return false;
  if (!/\.(ts|tsx|js|jsx)$/.test(f)) return false;
  if (f.includes("__tests__")) return false;
  if (f.includes(".test.")) return false;
  if (f.includes(".spec.")) return false;
  if (f.includes(".stories.")) return false;
  // Generated Supabase types are not authored production code
  if (f === "src/types/supabase-database.ts") return false;
  return true;
}

function main() {
  const baseRef = getBaseRef();
  console.log(`[lint:changed] Base ref: ${baseRef ?? "(none)"}`);

  const changed = getChangedFiles(baseRef);
  if (changed.length === 0) {
    console.log("[lint:changed] No changed files detected — skipping.");
    return;
  }

  const production = changed.filter(isProductionFile);

  if (production.length === 0) {
    console.log("[lint:changed] No changed production files — skipping.");
    console.log(`[lint:changed] Changed files (${changed.length}): ${changed.join(", ")}`);
    return;
  }

  console.log(`[lint:changed] Changed production files (${production.length}):`);
  for (const f of production) console.log(`  - ${f}`);

  // Run eslint with --max-warnings=0 on changed production files
  const eslintBin = "pnpm";
  const args = ["exec", "eslint", "--max-warnings=0", ...production];
  console.log(`[lint:changed] Running: ${eslintBin} ${args.join(" ")}`);

  const result = spawnSync(eslintBin, args, { stdio: "inherit" });

  if (result.error) {
    console.error(`[lint:changed] Failed to run eslint: ${result.error.message}`);
    process.exit(2);
  }

  process.exit(result.status ?? 0);
}

main();
