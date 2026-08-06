import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

const EXPECTED_ZONE_ORDER = [
  "tests",
  "routes",
  "server-actions",
  "ui-primitives",
  "features",
  "shared-presentation",
  "shared",
  "hooks",
  "types",
  "scripts",
  "prisma",
] as const;

function stripJsonComments(source: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (inString) {
      out += char;
      if (char === "\\" && next !== undefined) {
        out += next;
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
    } else if (char === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i += 1;
      out += "\n";
    } else {
      out += char;
    }
  }
  return out;
}

function parseJsonOutput(stdout: string): {
  version: string;
  total_issues: number;
  boundary_violations: Array<{
    from_path: string;
    to_path: string;
    from_zone: string;
    to_zone: string;
  }>;
} {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  return JSON.parse(stdout.slice(start, end + 1));
}

function readPolicy(): Record<string, unknown> {
  const source = readFileSync(join(process.cwd(), ".fallowrc.json"), "utf8");
  return JSON.parse(stripJsonComments(source)) as Record<string, unknown>;
}

describe("fallow config", () => {
  it("pins fallow to an exact version and exposes the expected scripts", async () => {
    const { default: pkg } = await import("../../../package.json", {
      with: { type: "json" },
    });

    expect(pkg.devDependencies.fallow).toBe("2.54.3");
    expect(pkg.scripts["fallow:audit"]).toBe("pnpm exec fallow audit");
    expect(pkg.scripts["fallow:dead-code"]).toBe("pnpm exec fallow dead-code");
    expect(pkg.scripts["fallow:dupes"]).toBe("pnpm exec fallow dupes");
    expect(pkg.scripts["fallow:health"]).toBe("pnpm exec fallow health");
    expect(pkg.scripts["fallow:flags"]).toBe("pnpm exec fallow flags");
    expect(pkg.scripts["fallow:baseline"]).toBe("tsx scripts/refresh-fallow-baselines.ts");
  });

  it("classifies every source path group and permits only the documented seams", () => {
    const policy = readPolicy();

    expect(policy.ignoreDependencies).toEqual(["supabase", "shadcn", "react-dom"]);
    expect(policy.rules).toEqual({ "unresolved-imports": "warn" });
    expect(policy.audit).toEqual({
      deadCodeBaseline: "fallow-baselines/dead-code.json",
      healthBaseline: "fallow-baselines/health.json",
      dupesBaseline: "fallow-baselines/dupes.json",
    });

    const boundaries = policy.boundaries as {
      zones: Array<{ name: string; patterns: string[] }>;
      rules: Array<{ from: string; allow: string[] }>;
    };

    expect(boundaries.zones.map((zone) => zone.name)).toEqual(EXPECTED_ZONE_ORDER);
    expect(boundaries.zones.find((zone) => zone.name === "routes")?.patterns).toContain(
      "src/app/**"
    );
    expect(boundaries.zones.find((zone) => zone.name === "ui-primitives")?.patterns).toContain(
      "src/components/ui/**"
    );
    expect(boundaries.zones.find((zone) => zone.name === "shared")?.patterns).toContain(
      "src/lib/**"
    );
    expect(boundaries.zones.find((zone) => zone.name === "types")?.patterns).toContain(
      "src/types/**"
    );

    expect(boundaries.rules).toEqual([
      { from: "ui-primitives", allow: ["shared"] },
      { from: "shared", allow: ["types"] },
    ]);
  });

  it("rejects forbidden boundary crossings and permits the documented seams", () => {
    const fallowBin = join(dirname(require.resolve("fallow/package.json")), "bin", "fallow");
    const fixture = mkdtempSync(join(tmpdir(), "fallow-boundaries-"));
    try {
      for (const dir of [
        "src/components/ui",
        "src/features",
        "src/app",
        "src/types",
        "src/lib",
        "src/lib/actions",
        "src/lib/supabase",
      ]) {
        mkdirSync(join(fixture, dir), { recursive: true });
      }

      writeFileSync(
        join(fixture, "package.json"),
        JSON.stringify({ name: "fallow-boundary-fixture", private: true })
      );
      writeFileSync(
        join(fixture, ".fallowrc.json"),
        readFileSync(join(process.cwd(), ".fallowrc.json"))
      );
      writeFileSync(join(fixture, "src/features/flag.ts"), "export const flag = 1;\n");
      writeFileSync(join(fixture, "src/app/page.tsx"), 'export const page = "route";\n');
      writeFileSync(join(fixture, "src/types/db.ts"), "export interface DbShape { id: string }\n");
      writeFileSync(
        join(fixture, "src/components/ui/badge.tsx"),
        'import { flag } from "../../features/flag";\nexport const badge = flag;\n'
      );
      writeFileSync(
        join(fixture, "src/lib/helper.ts"),
        'import { page } from "../app/page";\nexport const helper = page;\n'
      );
      writeFileSync(
        join(fixture, "src/lib/actions/action.ts"),
        'import { flag } from "../../features/flag";\nexport const action = flag;\n'
      );
      writeFileSync(
        join(fixture, "src/lib/supabase/adapter.ts"),
        'import type { DbShape } from "../../types/db";\nexport const adapter: DbShape = { id: "x" };\n'
      );
      writeFileSync(
        join(fixture, "src/index.ts"),
        [
          'import { badge } from "./components/ui/badge";',
          'import { helper } from "./lib/helper";',
          'import { action } from "./lib/actions/action";',
          'import { adapter } from "./lib/supabase/adapter";',
          "export { badge, helper, action, adapter };",
          "",
        ].join("\n")
      );

      const child = spawnSync(
        process.execPath,
        [
          fallowBin,
          "-r",
          fixture,
          "dead-code",
          "--boundary-violations",
          "--format",
          "json",
          "--quiet",
        ],
        { encoding: "utf8" }
      );
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(1);

      const result = parseJsonOutput(child.stdout);
      expect(result.version).toBe("2.54.3");
      expect(result.total_issues).toBe(2);

      const crossings = result.boundary_violations.map(
        (violation) => `${violation.from_zone}->${violation.to_zone}`
      );
      expect(new Set(crossings)).toEqual(new Set(["ui-primitives->features", "shared->routes"]));

      const offendingFiles = result.boundary_violations.map((violation) => violation.from_path);
      expect(offendingFiles).toContain("src/components/ui/badge.tsx");
      expect(offendingFiles).toContain("src/lib/helper.ts");
      expect(result.boundary_violations).not.toContain(
        expect.objectContaining({ from_path: "src/lib/actions/action.ts" })
      );
      expect(result.boundary_violations).not.toContain(
        expect.objectContaining({ from_path: "src/lib/supabase/adapter.ts" })
      );
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
