#!/usr/bin/env node
// fallow-ignore-file unused-file
/**
 * CLI wrapper around the risk-domain classifier (issue #551).
 *
 * Prints the selection and, when running inside GitHub Actions, writes the
 * outputs expected by `.depot/workflows/ci.yml` (`needs.select.outputs.*`).
 * Scheduled or manual full-matrix runs pass `--all`.
 */

import { appendFileSync } from "node:fs";

import { getBaseRef, getChangedFiles } from "./lib/changed-files.mjs";
import { selectChecks } from "./lib/risk-domains.mjs";

const forceAll = process.argv.includes("--all") || process.env.SELECT_ALL_CHECKS === "true";
const baseRef = getBaseRef();
const changedFiles = forceAll ? [] : getChangedFiles(baseRef);
const selection = selectChecks(changedFiles, { all: forceAll });

console.log(
  `[select-checks] Base ref: ${forceAll ? "(full matrix forced)" : (baseRef ?? "(none)")}`
);
console.log(`[select-checks] Changed files: ${forceAll ? "n/a" : changedFiles.length}`);
if (!forceAll && changedFiles.length > 0 && changedFiles.length <= 40) {
  for (const file of changedFiles) console.log(`  - ${file}`);
}
console.log(`[select-checks] Risk domains: ${selection.domains.join(", ") || "(none)"}`);
for (const key of ["run_build", "run_database", "run_browser", "run_visual"]) {
  console.log(`[select-checks] ${key}=${selection[key]}`);
}

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  const lines = Object.keys(selection)
    .filter((key) => key.startsWith("run_"))
    .map((key) => `${key}=${selection[key]}`)
    .join("\n");
  appendFileSync(githubOutput, `${lines}\n`);
}
