#!/usr/bin/env node
/**
 * Check Prettier formatting on changed files only.
 * Uses --check and never mutates files.
 */

import { getBaseRef, getChangedFiles, runCheck } from "./lib/changed-files.mjs";

// fallow-ignore-next-line complexity
function main() {
  const baseRef = getBaseRef();
  console.log(`[prettier:changed] Base ref: ${baseRef ?? "(none)"}`);

  const changed = getChangedFiles(baseRef);
  if (changed.length === 0) {
    console.log("[prettier:changed] No changed files — skipping.");
    return;
  }

  // fallow-ignore-next-line complexity
  const filtered = changed.filter((f) => {
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

  runCheck("prettier:changed", "pnpm", ["exec", "prettier", "--check", ...filtered]);
}

main();
