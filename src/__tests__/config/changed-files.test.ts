/**
 * @vitest-environment node
 */
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { existingFiles, getChangedFiles } from "../../../scripts/ci/lib/changed-files.mjs";

/**
 * CI changed-file contract: Git's D status must stay collected so risk
 * selection still expands gates when a schema, migration, browser test, or
 * application page is deleted, while existingFiles() must drop those paths
 * before Prettier or ESLint run, since both exit 2 on paths that no longer
 * exist.
 */
describe("changed-files", () => {
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

  function collectIn(repo: string) {
    // getChangedFiles and existingFiles resolve relative paths against the
    // process working directory, so both must run inside the fixture repo,
    // matching how the check scripts invoke them from the repository root.
    const previousCwd = process.cwd();
    process.chdir(repo);
    try {
      const changed = getChangedFiles("HEAD") as string[];
      return { changed, existing: existingFiles(changed) };
    } finally {
      process.chdir(previousCwd);
    }
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

    const { changed } = collectIn(repo);

    expect(changed).toContain(join("prisma", "schema.prisma"));
    expect(changed).toContain(join("src", "app", "page.tsx"));
  });

  it("filters deleted paths out so content checks only see existing files", () => {
    const repo = initRepo();
    mkdirSync(join(repo, "src", "app"), { recursive: true });
    writeFileSync(join(repo, "src", "app", "kept.tsx"), "export const kept = 1;\n");
    writeFileSync(join(repo, "src", "app", "removed.tsx"), "export const removed = 1;\n");
    execSync("git add -A && git commit --no-gpg-sign -m init", { cwd: repo, stdio: "pipe" });
    rmSync(join(repo, "src", "app", "removed.tsx"));
    writeFileSync(join(repo, "src", "app", "kept.tsx"), "export const kept = 2;\n");

    const { changed, existing } = collectIn(repo);

    expect(changed).toContain(join("src", "app", "removed.tsx"));
    expect(existing).toContain(join("src", "app", "kept.tsx"));
    expect(existing).not.toContain(join("src", "app", "removed.tsx"));
  });

  it("reduces a deletion-only change to nothing so content checks skip", () => {
    const repo = initRepo();
    mkdirSync(join(repo, "src", "app"), { recursive: true });
    writeFileSync(join(repo, "src", "app", "page.tsx"), "export default function Page() {}\n");
    execSync("git add -A && git commit --no-gpg-sign -m init", { cwd: repo, stdio: "pipe" });
    rmSync(join(repo, "src", "app", "page.tsx"));

    const { changed, existing } = collectIn(repo);

    expect(changed).toContain(join("src", "app", "page.tsx"));
    expect(existing).toEqual([]);
  });
});
