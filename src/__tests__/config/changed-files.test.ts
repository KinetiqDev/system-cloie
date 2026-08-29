/**
 * @vitest-environment node
 */
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { getChangedFiles } from "../../../scripts/ci/lib/changed-files.mjs";

/**
 * Deletion regression for CI risk selection: a deleted risk-domain path must
 * still be collected, or removing a schema, migration, browser test, or
 * application page would silently disable the build, database, browser, and
 * visual gates. The diff filter must include Git's D status.
 */
describe("getChangedFiles", () => {
  const repos: string[] = [];

  afterEach(() => {
    for (const repo of repos) rmSync(repo, { recursive: true, force: true });
    repos.length = 0;
  });

  function initRepo() {
    const repo = mkdtempSync(join(tmpdir(), "cloie-changed-files-"));
    repos.push(repo);
    const git = (command: string) => execSync(command, { cwd: repo, stdio: "pipe" });
    git("git init --initial-branch=main");
    git("git config user.email ci@example.com");
    git("git config user.name CI");
    return repo;
  }

  it("collects deleted risk-domain paths from the working tree", () => {
    const repo = initRepo();
    mkdirSync(join(repo, "prisma"), { recursive: true });
    mkdirSync(join(repo, "src", "app"), { recursive: true });
    writeFileSync(join(repo, "prisma", "schema.prisma"), "datasource db {}\n");
    writeFileSync(join(repo, "src", "app", "page.tsx"), "export default function Page() {}\n");
    execSync("git add -A && git commit --no-gpg-sign -m init", { cwd: repo, stdio: "pipe" });
    rmSync(join(repo, "prisma", "schema.prisma"));
    rmSync(join(repo, "src", "app", "page.tsx"));

    // getChangedFiles shells out to git in the process working directory.
    const previousCwd = process.cwd();
    process.chdir(repo);
    let changed: string[];
    try {
      changed = getChangedFiles("HEAD") as string[];
    } finally {
      process.chdir(previousCwd);
    }

    expect(changed).toContain(join("prisma", "schema.prisma"));
    expect(changed).toContain(join("src", "app", "page.tsx"));
  });
});
