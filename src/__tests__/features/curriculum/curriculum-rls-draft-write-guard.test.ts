import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSupabaseMigrationsDir(): string {
  return join(__dirname, "..", "..", "..", "..", "supabase", "migrations");
}

function listMigrationFiles(): string[] {
  const dir = readSupabaseMigrationsDir();
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function readMigrationContent(filename: string): string {
  const dir = readSupabaseMigrationsDir();
  const path = join(dir, filename);
  if (!existsSync(path)) {
    return "";
  }
  return readFileSync(path, "utf-8");
}

interface PolicyStatement {
  name: string;
  table: string;
  command: string;
  body: string;
}

/**
 * Replays the append-only migration ledger in chronological order and returns
 * the FINAL state of every CREATE POLICY statement (older migrations may DROP
 * and re-CREATE a policy; the last CREATE by name wins). This mirrors how
 * Postgres reaches the live policy state.
 */
function finalPolicyState(): PolicyStatement[] {
  const byTableAndName = new Map<string, PolicyStatement>();
  const dropRe = /DROP POLICY IF EXISTS\s+"([^"]+)"\s+ON\s+(\w+);/g;
  const createRe =
    /CREATE POLICY\s+"([^"]+)"\s+ON\s+(\w+)\s+FOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL)\s+TO\s+authenticated([\s\S]*?);/g;

  for (const file of listMigrationFiles()) {
    const content = readMigrationContent(file);
    for (const match of content.matchAll(dropRe)) {
      byTableAndName.delete(`${match[2]}\u0000${match[1]}`);
    }
    for (const match of content.matchAll(createRe)) {
      byTableAndName.set(`${match[2]}\u0000${match[1]}`, {
        name: match[1],
        table: match[2],
        command: match[3],
        body: match[4],
      });
    }
  }

  return [...byTableAndName.values()];
}

const CURRICULUM_TABLES = ["curriculum_versions", "curriculum_courses"] as const;

const WRITE_COMMANDS = ["INSERT", "UPDATE", "DELETE"] as const;

describe("Curriculum RLS policy: migration ledger integrity (always runs)", () => {
  // Static guard: the FINAL migration-ledger policy state must keep published
  // and retired curricula immutable against direct authenticated writes.
  // Background: the initial curriculum policies granted `FOR ALL` writes to any
  // SECRETARY or in-scope PROGRAM_HEAD, so a direct PostgREST request could
  // UPDATE/DELETE PUBLISHED/RETIRED rows and bypass the application guard.
  // 20260811063000_restrict_curriculum_writes_to_draft.sql splits writes by
  // command type and requires DRAFT. Because migrations are append-only ledger
  // history, this test replays them and asserts the final shape.

  it("retains read-for-all SELECT policies on both curriculum tables", () => {
    const state = finalPolicyState();
    for (const table of CURRICULUM_TABLES) {
      const readPolicies = state.filter(
        (p) =>
          p.table === table &&
          p.command === "SELECT" &&
          p.name === "Enable read access for authenticated users"
      );
      expect(readPolicies, `expected a read SELECT policy on ${table}`).toHaveLength(1);
      expect(readPolicies[0].body).toContain("USING (true)");
    }
  });

  it("leaves no FOR ALL write policy on either curriculum table", () => {
    const state = finalPolicyState();
    for (const table of CURRICULUM_TABLES) {
      const allWritePolicies = state.filter((p) => p.table === table && p.command === "ALL");
      expect(allWritePolicies, `expected no FOR ALL policy on ${table}`).toEqual([]);
    }
  });

  it("guards every curriculum_versions write policy with a DRAFT status", () => {
    const state = finalPolicyState().filter((p) => p.table === "curriculum_versions");

    const writePolicies = state.filter((p) =>
      WRITE_COMMANDS.includes(p.command as (typeof WRITE_COMMANDS)[number])
    );
    expect(writePolicies).toHaveLength(6);

    for (const policy of writePolicies) {
      expect(policy.name).toMatch(
        /^Enable (insert|update|delete) for (secretary|program head) on draft curriculum$/
      );
      if (policy.command === "INSERT") {
        expect(policy.body).toContain("WITH CHECK (");
        expect(policy.body).toContain("status = 'DRAFT'");
      }
      if (policy.command === "UPDATE") {
        expect(policy.body).toContain("USING (");
        expect(policy.body).toContain("WITH CHECK (");
        expect(policy.body.match(/status = 'DRAFT'/g)).toHaveLength(2);
      }
      if (policy.command === "DELETE") {
        expect(policy.body).toContain("USING (");
        expect(policy.body).toContain("status = 'DRAFT'");
        expect(policy.body).not.toContain("WITH CHECK");
      }
    }
  });

  it("guards every curriculum_courses write policy with a DRAFT parent version", () => {
    const state = finalPolicyState().filter((p) => p.table === "curriculum_courses");

    const writePolicies = state.filter((p) =>
      WRITE_COMMANDS.includes(p.command as (typeof WRITE_COMMANDS)[number])
    );
    expect(writePolicies).toHaveLength(6);

    for (const policy of writePolicies) {
      expect(policy.name).toMatch(
        /^Enable (insert|update|delete) for (secretary|program head) on draft curriculum course$/
      );
      expect(policy.body.match(/cv\.status = 'DRAFT'/g)?.length).toBeGreaterThanOrEqual(1);
      expect(policy.body).not.toContain("status = 'DRAFT' AND");
    }
  });

  it("keeps Secretary and Program Head role predicates in every write policy", () => {
    const state = finalPolicyState().filter(
      (p) =>
        CURRICULUM_TABLES.includes(p.table as (typeof CURRICULUM_TABLES)[number]) &&
        p.command !== "SELECT"
    );
    expect(state.length).toBeGreaterThan(0);

    for (const policy of state) {
      if (policy.name.includes("secretary")) {
        expect(policy.body).toContain("ur.role = 'SECRETARY'");
        expect(policy.body).toContain("u.auth_user_id = auth.uid()");
      }
      if (policy.name.includes("program head")) {
        expect(policy.body).toContain("ur.role = 'PROGRAM_HEAD'");
        expect(policy.body).toContain("pha.is_active = true");
      }
    }
  });
});
