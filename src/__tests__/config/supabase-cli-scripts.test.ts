import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Supabase CLI config", () => {
  it("tracks the CLI dependency, scripts, and target-neutral env contract", async () => {
    const [{ default: pkg }, envExample] = await Promise.all([
      import("../../../package.json", { with: { type: "json" } }),
      readFile(path.join(process.cwd(), ".env.example"), "utf8"),
    ]);

    const scriptEntryFiles = Object.values(pkg.scripts)
      .filter((script): script is string => typeof script === "string")
      .filter((script) => script.startsWith("tsx scripts/"))
      .map((script) => script.slice("tsx ".length).split(" ")[0]);

    await Promise.all(scriptEntryFiles.map((file) => access(path.join(process.cwd(), file))));

    expect(pkg.devDependencies.supabase).toBeDefined();

    expect(pkg.scripts["supabase:init"]).toBe("tsx scripts/run-supabase-command.ts init");
    expect(pkg.scripts["supabase:start"]).toBe("tsx scripts/run-supabase-command.ts local start");
    expect(pkg.scripts["supabase:stop"]).toBe("tsx scripts/run-supabase-command.ts local stop");
    expect(pkg.scripts["supabase:status"]).toBe("tsx scripts/run-supabase-command.ts local status");
    expect(pkg.scripts["supabase:reset"]).toBe("tsx scripts/run-supabase-command.ts local reset");
    expect(pkg.scripts["supabase:migration:list:local"]).toBe(
      "tsx scripts/run-supabase-command.ts local migration-list"
    );
    expect(pkg.scripts["supabase:types:local"]).toBe(
      "tsx scripts/generate-supabase-types.ts local"
    );
    expect(pkg.scripts["supabase:migration:baseline"]).toBe(
      "tsx scripts/create-supabase-migration.ts baseline"
    );
    expect(pkg.scripts["supabase:migration:diff"]).toBe(
      "tsx scripts/create-supabase-migration.ts diff"
    );
    expect(pkg.scripts["supabase:migration:list"]).toBe(
      "tsx scripts/run-supabase-command.ts remote migration-list"
    );
    expect(pkg.scripts["supabase:push:dry-run"]).toBe(
      "tsx scripts/run-supabase-command.ts remote push --dry-run"
    );
    expect(pkg.scripts["supabase:push"]).toBe("tsx scripts/run-supabase-command.ts remote push");
    expect(pkg.scripts["supabase:types"]).toBe("tsx scripts/generate-supabase-types.ts remote");

    for (const [scriptName, scriptValue] of Object.entries(pkg.scripts)) {
      expect(scriptName).not.toMatch(/supabase:(login|link|migration:repair-latest)/);
      expect(scriptValue).not.toContain("--linked");
    }

    expect(envExample).not.toContain("SUPABASE_PROJECT_REF");
    expect(envExample).not.toContain("SUPABASE_ACCESS_TOKEN");
    expect(envExample).not.toContain("SUPABASE_DB_PASSWORD");
    expect(envExample).toContain("DIRECT_URL");
  });

  it("keeps local OAuth callbacks path-scoped and fail-closed", async () => {
    const config = await readFile(path.join(process.cwd(), "supabase", "config.toml"), "utf8");

    expect(config).toContain('site_url = "http://localhost:3000"');
    expect(config).toContain('"http://localhost:3000/api/auth/callback"');
    expect(config).toContain('"http://127.0.0.1:3000/api/auth/callback"');
    expect(config).not.toContain("*.trycloudflare.com");
  });
});
