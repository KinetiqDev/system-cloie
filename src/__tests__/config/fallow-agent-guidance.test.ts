import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const AGENTS_MD = readFileSync(join(ROOT, "AGENTS.md"), "utf8");
const RUNBOOK = readFileSync(join(ROOT, "docs", "agents", "fallow.md"), "utf8");
const SKILLS_MD = readFileSync(join(ROOT, "docs", "skills.md"), "utf8");
const ADR_0011 = readFileSync(
  join(ROOT, "docs", "adr", "0011-fallow-code-intelligence-policy.md"),
  "utf8",
);

const GUIDANCE_TEXT = `${AGENTS_MD}\n${RUNBOOK}\n${ADR_0011}`;

function supportedCliCommands(): string[] {
  const child = spawnSync("pnpm", ["exec", "fallow", "--help"], {
    encoding: "utf8",
    timeout: 30_000,
  });
  expect(child.status, `fallow --help exited with status ${child.status}`).toBe(0);
  const commands = [
    ...(child.stdout.matchAll(/^  ([a-z][a-z0-9-]+)\s{2,}/gm) ?? []),
  ].map((match) => match[1]);
  expect(commands.length).toBeGreaterThan(0);
  return commands;
}

function flagsForSubcommand(command: string): string[] {
  const child = spawnSync("pnpm", ["exec", "fallow", command, "--help"], {
    encoding: "utf8",
    timeout: 30_000,
  });
  expect(
    child.status,
    `fallow ${command} --help exited with status ${child.status}: ${child.stderr}`,
  ).toBe(0);
  const flags = new Set<string>();
  for (const match of child.stdout.matchAll(/^\s{0,6}(?:-[a-z], )?--([a-z][a-z0-9-]*)/gm)) {
    flags.add(match[1]);
  }
  for (const match of child.stdout.matchAll(/\[aliases: ([^\]]+)\]/g)) {
    for (const alias of match[1].split(",")) {
      const name = alias.trim().match(/^--([a-z][a-z0-9-]*)$/);
      if (name) flags.add(name[1]);
    }
  }
  return [...flags];
}

function documentedCommands(): Array<{ command: string; flags: string[] }> {
  const entries: Array<{ command: string; flags: string[] }> = [];
  for (const match of GUIDANCE_TEXT.matchAll(
    /pnpm exec fallow ([a-z][a-z0-9-]*)([^`\n]*)/g,
  )) {
    if (!match) continue;
    entries.push({
      command: match[1],
      flags: [...match[2].matchAll(/--([a-z][a-z0-9-]*)/g)].map((flag) => flag[1]),
    });
  }
  return entries;
}

function fallowPackageScripts(): string[] {
  const { scripts } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  return Object.keys(scripts).filter((name) => name.startsWith("fallow:"));
}

describe("AGENTS.md code intelligence guidance", () => {
  it("requires tracing before deleting", () => {
    expect(AGENTS_MD).toMatch(/before deleting/i);
    expect(AGENTS_MD).toMatch(/trace the finding/i);
  });

  it("requires tracing before refactoring for complexity or duplication", () => {
    expect(AGENTS_MD).toMatch(/before refactoring/i);
    expect(AGENTS_MD).toMatch(/domain invariants/i);
  });

  it("protects framework, generated, public inventory, and domain categories", () => {
    for (const category of [
      "Next.js entry points",
      "Server Actions",
      "generated types",
      "shadcn",
      "dynamic consumers",
      "domain context",
    ]) {
      expect(AGENTS_MD).toContain(category);
    }
  });

  it("prohibits unattended mutation and requires dry-run-first fixes", () => {
    expect(AGENTS_MD).toMatch(/fix --yes/);
    expect(AGENTS_MD).toMatch(/unattended/i);
    expect(AGENTS_MD).toMatch(/dry-run|fix_preview/i);
  });
});

describe("fallow runbook (docs/agents/fallow.md)", () => {
  it("records the deprecated MCP wiring without claiming active server config", () => {
    expect(RUNBOOK).toMatch(/deprecated/i);
    expect(RUNBOOK).toMatch(/opencode\.json/);
    expect(RUNBOOK).not.toMatch(/declares a project-local MCP server/);
  });

  it(
    "documents only commands and flags the installed fallow supports",
    () => {
      const supported = supportedCliCommands();
      const documented = documentedCommands();
      expect(documented.length).toBeGreaterThan(0);

      const flagsByCommand = new Map<string, Set<string>>();
      for (const { command, flags } of documented) {
        expect(supported, `pnpm exec fallow ${command} is not installed`).toContain(command);
        if (!flagsByCommand.has(command)) flagsByCommand.set(command, new Set());
        for (const flag of flags) flagsByCommand.get(command)!.add(flag);
      }

      for (const [command, flags] of flagsByCommand) {
        if (flags.size === 0) continue;
        const helpFlags = flagsForSubcommand(command);
        for (const flag of flags) {
          expect(
            helpFlags,
            `--${flag} is not supported by fallow ${command} (2.54.3)`,
          ).toContain(flag);
        }
      }
    },
    30_000,
  );

  it("documents only fallow package scripts that exist", () => {
    const scripts = fallowPackageScripts();
    const documented = [
      ...(GUIDANCE_TEXT.matchAll(/`pnpm (fallow:[a-z][a-z0-9-]*)`/g) ?? []),
    ].map((match) => match[1]);
    expect(documented.length).toBeGreaterThan(0);
    for (const script of documented) {
      expect(scripts, `pnpm ${script} is not defined in package.json`).toContain(script);
    }
  });

  it("requires dry-run evidence before fixes", () => {
    expect(RUNBOOK).toMatch(/fix --dry-run/);
    expect(RUNBOOK).toMatch(/Never run `pnpm exec fallow fix --yes`/);
  });

  it("uses the project-local pnpm exec fallow form for every CLI example", () => {
    const bareExamples = [
      ...(GUIDANCE_TEXT.matchAll(/`fallow ([a-z][a-z0-9-]*)/g) ?? []),
    ].map((match) => match[1]);
    expect(
      bareExamples,
      "executable CLI examples must use `pnpm exec fallow <cmd>`, not a bare `fallow <cmd>`",
    ).toEqual([]);
  });

  it("gates baseline refresh to human operators", () => {
    expect(RUNBOOK).toMatch(/pnpm fallow:baseline/);
    expect(RUNBOOK).toMatch(/human-gated/i);
  });

  it("distinguishes report intake from the tracked refactor work", () => {
    expect(RUNBOOK).toMatch(/#174/);
    expect(RUNBOOK).toMatch(/does not implement/i);
  });
});

describe("fallow references in the skills catalog", () => {
  it("lists the fallow skill with its code intelligence role", () => {
    expect(SKILLS_MD).toMatch(/\*\*fallow\*\*/);
    expect(SKILLS_MD).toMatch(/codebase intelligence/i);
  });
});

describe("ADR 0011 records the durable fallow policy", () => {
  it("records the baseline-backed changed-file gate", () => {
    expect(ADR_0011).toMatch(/baseline-backed/i);
    expect(ADR_0011).toMatch(/changed-file/i);
  });

  it("records the enforced seams exactly and leaves other zones unrestricted", () => {
    expect(ADR_0011).toMatch(/narrow seams/i);
    expect(ADR_0011).toMatch(/report-only/i);
    expect(ADR_0011).toMatch(/ui-primitives/);
    expect(ADR_0011).toMatch(/unrestricted/i);
  });
});
