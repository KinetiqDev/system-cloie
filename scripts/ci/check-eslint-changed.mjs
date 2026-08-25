#!/usr/bin/env node
/**
 * Check ESLint warnings in changed production code only.
 * Fails when any changed production file introduces a warning or error.
 */

import { getBaseRef, getChangedFiles, runCheck } from "./lib/changed-files.mjs";

// fallow-ignore-next-line complexity
function isProductionFile(f) {
  if (!f.startsWith("src/")) return false;
  if (!/\.(ts|tsx|js|jsx)$/.test(f)) return false;
  if (f.includes("__tests__")) return false;
  if (f.includes(".test.")) return false;
  if (f.includes(".spec.")) return false;
  if (f.includes(".stories.")) return false;
  if (f === "src/types/supabase-database.ts") return false;
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

  const production = changed.filter(isProductionFile);

  if (production.length === 0) {
    console.log("[lint:changed] No changed production files — skipping.");
    console.log(`[lint:changed] Changed files (${changed.length}): ${changed.join(", ")}`);
    return;
  }

  console.log(`[lint:changed] Changed production files (${production.length}):`);
  for (const f of production) console.log(`  - ${f}`);

  runCheck("lint:changed", "pnpm", ["exec", "eslint", "--max-warnings=0", ...production]);
}

main();
