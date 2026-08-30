#!/usr/bin/env node
/**
 * Check Prettier formatting on changed files only.
 * Uses --check and never mutates files.
 */

import { existingFiles, getBaseRef, getChangedFiles, runCheck } from "./lib/changed-files.mjs";

// fallow-ignore-next-line complexity
function main() {
  const baseRef = getBaseRef();
  console.log(`[prettier:changed] Base ref: ${baseRef ?? "(none)"}`);

  const changed = getChangedFiles(baseRef);
  if (changed.length === 0) {
    console.log("[prettier:changed] No changed files — skipping.");
    return;
  }

  const excludedPrefixes = [".next/", "node_modules/", "playwright-report/", "test-results/"];
  const filtered = existingFiles(
    changed.filter((f) => !excludedPrefixes.some((prefix) => f.startsWith(prefix)))
  );

  if (filtered.length === 0) {
    console.log("[prettier:changed] No relevant changed files.");
    return;
  }

  console.log(`[prettier:changed] Checking ${filtered.length} changed files with prettier --check`);
  for (const f of filtered) console.log(`  - ${f}`);

  runCheck("prettier:changed", "pnpm", [
    "exec",
    "prettier",
    "--check",
    "--ignore-unknown",
    ...filtered,
  ]);
}

main();
