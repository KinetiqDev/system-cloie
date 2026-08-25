#!/usr/bin/env node
/**
 * Check Prettier formatting on changed files only.
 * Uses --check and never mutates files.
 */

import { execSync, spawnSync } from "node:child_process";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: "pipe" }).trim();
}

function getBaseRef() {
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
  try {
    const out = run("git ls-files --others --exclude-standard");
    if (out)
      out
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((f) => working.add(f));
  } catch {}
  return [...new Set([...committed, ...working])];
}

function main() {
  const baseRef = getBaseRef();
  console.log(`[prettier:changed] Base ref: ${baseRef ?? "(none)"}`);

  const changed = getChangedFiles(baseRef);
  if (changed.length === 0) {
    console.log("[prettier:changed] No changed files — skipping.");
    return;
  }

  // Prettier handles its own ignore via .prettierignore; filter to files prettier can format
  // but let prettier decide. We pass only changed files that are not deleted.
  const filtered = changed.filter((f) => {
    // skip deleted or non-existent? git diff ACMRT already excludes D
    // allow all; prettier will ignore unsupported files quickly
    if (
      f.startsWith(".next/") ||
      f.startsWith("node_modules/") ||
      f.startsWith("playwright-report/") ||
      f.startsWith("test-results/")
    )
      return false;
    return true;
  });

  if (filtered.length === 0) {
    console.log("[prettier:changed] No relevant changed files.");
    return;
  }

  console.log(`[prettier:changed] Checking ${filtered.length} changed files with prettier --check`);
  for (const f of filtered) console.log(`  - ${f}`);

  const result = spawnSync("pnpm", ["exec", "prettier", "--check", ...filtered], {
    stdio: "inherit",
  });
  if (result.error) {
    console.error(`[prettier:changed] Failed to run prettier: ${result.error.message}`);
    process.exit(2);
  }
  process.exit(result.status ?? 0);
}

main();
