import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());

const DATABASE_GATE_MARKER = "RUN_DATABASE_INTEGRATION_TESTS";
const SKIP_IF_MARKER = "describe.skipIf";

const EXCLUDE_DIRS: Record<string, true> = {
  node_modules: true,
  ".next": true,
  dist: true,
  ".opencode": true,
  ".claude": true,
  ".cursor": true,
};

const EXCLUDED_FILES: Record<string, true> = {
  "src/__tests__/config/vitest-discovery.test.ts": true,
  "src/__tests__/config/database-suite-completeness.test.ts": true,
};

const TEST_EXT_RE = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (EXCLUDE_DIRS[entry]) continue;
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walk(full, out);
    else if (stat.isFile() && TEST_EXT_RE.test(entry)) out.push(full);
  }
}

function isDatabaseSuiteContent(content: string): boolean {
  return content.includes(DATABASE_GATE_MARKER) && content.includes(SKIP_IF_MARKER);
}

function isGatedFileContent(content: string): boolean {
  return (
    content.includes(DATABASE_GATE_MARKER) &&
    (content.includes("skipIf") || content.includes("RUN_DATABASE"))
  );
}

export function discoverDatabaseSuites(repoRoot: string = REPO_ROOT): string[] {
  const srcRoot = join(repoRoot, "src");
  const candidates: string[] = [];
  walk(srcRoot, candidates);

  const suites: string[] = [];
  for (const file of candidates) {
    const rel = relative(repoRoot, file);
    if (EXCLUDED_FILES[rel]) continue;
    let content: string;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (isDatabaseSuiteContent(content)) suites.push(rel);
  }

  suites.sort();
  return suites;
}

function collectGatedFiles(repoRoot: string): string[] {
  const allTestFiles: string[] = [];
  walk(join(repoRoot, "src"), allTestFiles);
  const gatedFiles: string[] = [];
  for (const file of allTestFiles) {
    const rel = relative(repoRoot, file);
    if (EXCLUDED_FILES[rel]) continue;
    if (rel === "src/__tests__/config/vitest-discovery.test.ts") continue;
    let content: string;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (!isGatedFileContent(content)) continue;
    if (rel.includes("__tests__/config/vitest-discovery")) continue;
    gatedFiles.push(rel);
  }
  gatedFiles.sort();
  return gatedFiles;
}

export function getDatabaseSuiteCompleteness(repoRoot: string = REPO_ROOT): {
  suites: string[];
  gatedFiles: string[];
  orphans: string[];
} {
  const suites = discoverDatabaseSuites(repoRoot);
  const gatedFiles = collectGatedFiles(repoRoot);
  const suiteSet: Record<string, true> = {};
  for (const s of suites) suiteSet[s] = true;
  const orphans = gatedFiles.filter((f) => !suiteSet[f]);
  return { suites, gatedFiles, orphans };
}
