#!/usr/bin/env node
/**
 * Check ESLint warnings and errors in changed lintable files only.
 */

import { existingFiles, getBaseRef, getChangedFiles, runCheck } from "./lib/changed-files.mjs";

function isLintableFile(file) {
  if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) return false;
  if (file === "src/types/supabase-database.ts") return false;
  return true;
}

// fallow-ignore-next-line complexity
function main() {
  const baseRef = getBaseRef();
  console.log(`[lint:changed] Base ref: ${baseRef ?? "(none)"}`);

  const changed = getChangedFiles(baseRef);
  if (changed.length === 0) {
    console.log("[lint:changed] No changed files detected — skipping.");
    return;
  }

  const lintable = existingFiles(changed.filter(isLintableFile));

  if (lintable.length === 0) {
    console.log("[lint:changed] No changed lintable files — skipping.");
    console.log(`[lint:changed] Changed files (${changed.length}): ${changed.join(", ")}`);
    return;
  }

  console.log(`[lint:changed] Changed lintable files (${lintable.length}):`);
  for (const file of lintable) console.log(`  - ${file}`);

  runCheck("lint:changed", "pnpm", ["exec", "eslint", "--max-warnings=0", ...lintable]);
}

main();
