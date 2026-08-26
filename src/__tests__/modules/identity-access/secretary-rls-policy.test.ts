import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

import { prisma } from "@/lib/db/prisma";
import { RLS_AUTH_UUIDS } from "@/lib/db/rls-test-identities";
import { runRlsProbe } from "@/lib/db/rls-test-helpers";
import { U } from "../../../../prisma/seed/constants/ids";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSupabaseMigrationsDir(): string {
  // __dirname is src/__tests__/modules/identity-access/ -> walk up four levels
  return join(__dirname, "..", "..", "..", "..", "supabase", "migrations");
}

function listMigrationFiles(): string[] {
  const dir = readSupabaseMigrationsDir();
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // chronological order via timestamped prefixes
}

function readMigrationContent(filename: string): string {
  const dir = readSupabaseMigrationsDir();
  const path = join(dir, filename);
  if (!existsSync(path)) {
    return "";
  }
  return readFileSync(path, "utf-8");
}

/**
 * Replays the append-only migration ledger in chronological order and returns
 * the body of the LAST `CREATE POLICY "Enable write access for secretary only"`
 * statement targeting the given table. This mirrors how Postgres itself reaches
 * the live state: older migrations create the policy, newer migrations DROP+reCREATE
 * it. Only the most recent CREATE definition survives in the live database.
 */
function latestCreatePolicyBody(table: "school_years" | "academic_term_instances"): string {
  const files = listMigrationFiles();
  let last: string = "";
  for (const f of files) {
    const content = readMigrationContent(f);
    const re = new RegExp(
      `CREATE POLICY "Enable write access for secretary only"\\s+ON\\s+${table}[\\s\\S]*?\\);\\s*$`,
      "m"
    );
    const matches = content.match(re);
    if (matches && matches.length > 0) {
      last = matches[matches.length - 1];
    }
  }
  return last;
}

describe("Secretary RLS policy: migration ledger integrity (always runs)", () => {
  // Static guard: verify the migration ledger's FINAL state for both secretary-only
  // RLS policies uses `u.auth_user_id = auth.uid()` (the column that holds the
  // Supabase Auth UUID) and NOT `u.id = auth.uid()` (the public.users PK, which is
  // a separate gen_random_uuid() UUID).
  //
  // Background: the original rename migration 20260618124311 copied `u.id = auth.uid()`
  // from the legacy 20260510003018 admin-only policy, but `auth.uid()` returns the
  // auth UUID (stored in `User.auth_user_id`), not the public-users PK. The fix
  // lives in 20260618153711_fix_secretary_rls_user_join.sql, which DROPs and re-CREATEs
  // both policies with the corrected join. Because migrations are append-only ledger
  // history, this test replays them in chronological order and asserts the FINAL shape.

  it("school_years secretary policy uses u.auth_user_id = auth.uid() (not u.id)", () => {
    const body = latestCreatePolicyBody("school_years");
    expect(
      body,
      "expected a CREATE POLICY 'Enable write access for secretary only' ON school_years somewhere in the migration ledger"
    ).not.toBe("");
    expect(body).toContain("FOR ALL TO authenticated");
    expect(body).toContain("USING (");
    expect(body).toContain("WITH CHECK (");
    expect(body).toContain("ur.role = 'SECRETARY'");
    expect(body).toContain("u.auth_user_id = auth.uid()");
    expect(
      body.includes("u.id = auth.uid()"),
      "final 'Enable write access for secretary only' ON school_years must NOT use the wrong join u.id = auth.uid()"
    ).toBe(false);
  });

  it("academic_term_instances secretary policy uses u.auth_user_id = auth.uid() (not u.id)", () => {
    const body = latestCreatePolicyBody("academic_term_instances");
    expect(
      body,
      "expected a CREATE POLICY 'Enable write access for secretary only' ON academic_term_instances somewhere in the migration ledger"
    ).not.toBe("");
    expect(body).toContain("FOR ALL TO authenticated");
    expect(body).toContain("USING (");
    expect(body).toContain("WITH CHECK (");
    expect(body).toContain("ur.role = 'SECRETARY'");
    expect(body).toContain("u.auth_user_id = auth.uid()");
    expect(
      body.includes("u.id = auth.uid()"),
      "final 'Enable write access for secretary only' ON academic_term_instances must NOT use the wrong join u.id = auth.uid()"
    ).toBe(false);
  });

  it("fix migration file re-creates both secretary policies with the corrected join", () => {
    const fixFile = "20260618153711_fix_secretary_rls_user_join.sql";
    const expectedPath = join(readSupabaseMigrationsDir(), fixFile);
    expect(existsSync(expectedPath), `expected the RLS fix migration at ${expectedPath}`).toBe(
      true
    );

    const content = readMigrationContent(fixFile);
    expect(content).toContain(
      `DROP POLICY IF EXISTS "Enable write access for secretary only" ON school_years;`
    );
    expect(content).toContain(
      `DROP POLICY IF EXISTS "Enable write access for secretary only" ON academic_term_instances;`
    );
    // Inspect just the CREATE POLICY statements (not the SQL comments which
    // legitimately reference the broken pattern they're describing).
    const createStatements =
      content.match(/CREATE POLICY "Enable write access for secretary only"[\s\S]*?\);/g) || [];
    expect(createStatements.length).toBe(2);
    for (const stmt of createStatements) {
      expect(stmt).not.toContain("u.id = auth.uid()");
      expect(stmt).toContain("u.auth_user_id = auth.uid()");
    }
  });
});

describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "Secretary RLS Policies (live DB behavior)",
  () => {
    it("SECRETARY can write to school_years (INSERT school_years)", async () => {
      const code = `RLS-SEC-${crypto.randomUUID()}`;
      try {
        await runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, async (tx) => {
          await tx.$executeRawUnsafe(
            `INSERT INTO "school_years" ("code", "created_at", "updated_at") VALUES ($1, now(), now())`,
            code
          );
        });
      } finally {
        await prisma.schoolYear.deleteMany({ where: { code } });
      }
    });

    it("SECRETARY can write to school_years (UPDATE school_years)", async () => {
      const code = `RLS-SEC-UPD-${crypto.randomUUID()}`;
      try {
        const sy = await prisma.schoolYear.create({ data: { code } });
        const rows = await runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, async (tx) => {
          return tx.$executeRawUnsafe(
            `UPDATE "school_years" SET "start_date" = '2026-01-01' WHERE "id" = $1::uuid`,
            sy.id
          );
        });
        expect(rows).toBe(1);
      } finally {
        await prisma.schoolYear.deleteMany({ where: { code } });
      }
    });

    it("SECRETARY can write to academic_term_instances", async () => {
      const syCode = `RLS-TI-${crypto.randomUUID()}`;
      try {
        const sy = await prisma.schoolYear.create({ data: { code: syCode } });
        try {
          await runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, async (tx) => {
            await tx.$executeRawUnsafe(
              `INSERT INTO "academic_term_instances" ("school_year_id", "semester", "updated_at") VALUES ($1::uuid, '1ST', now())`,
              sy.id
            );
          });
        } finally {
          await prisma.academicTermInstance.deleteMany({
            where: { school_year_id: sy.id },
          });
        }
      } finally {
        await prisma.schoolYear.deleteMany({ where: { code: syCode } });
      }
    });

    it("SECRETARY can UPDATE academic_term_instances", async () => {
      const syCode = `RLS-TI-UPD-${crypto.randomUUID()}`;
      try {
        const sy = await prisma.schoolYear.create({ data: { code: syCode } });
        try {
          const term = await prisma.academicTermInstance.create({
            data: { school_year_id: sy.id, semester: "FIRST" as const },
          });
          const rows = await runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, async (tx) => {
            return tx.$executeRawUnsafe(
              `UPDATE "academic_term_instances" SET "status" = 'COMPLETED' WHERE "id" = $1::uuid`,
              term.id
            );
          });
          expect(rows).toBe(1);
        } finally {
          await prisma.academicTermInstance.deleteMany({
            where: { school_year_id: sy.id },
          });
        }
      } finally {
        await prisma.schoolYear.deleteMany({ where: { code: syCode } });
      }
    });

    it("Non-SECRETARY role is denied INSERT to school_years", async () => {
      const code = `RLS-DENY-${crypto.randomUUID()}`;
      await expect(
        runRlsProbe(RLS_AUTH_UUIDS.FACULTY, async (tx) => {
          await tx.$executeRawUnsafe(
            `INSERT INTO "school_years" ("code", "created_at", "updated_at") VALUES ($1, now(), now())`,
            code
          );
        })
      ).rejects.toMatchObject({ meta: { code: "42501" } });
      // Verify no row was created (the probe above should have rolled back,
      // but let's be explicit).
      const row = await prisma.schoolYear.findUnique({ where: { code } });
      expect(row).toBeNull();
    });

    it("Non-SECRETARY role is denied UPDATE to school_years", async () => {
      const code = `RLS-DENY-UPD-${crypto.randomUUID()}`;
      try {
        const sy = await prisma.schoolYear.create({ data: { code } });
        const rows = await runRlsProbe(RLS_AUTH_UUIDS.FACULTY, async (tx) => {
          return tx.$executeRawUnsafe(
            `UPDATE "school_years" SET "start_date" = '2026-01-01' WHERE "id" = $1::uuid`,
            sy.id
          );
        });
        // RLS makes the row invisible for UPDATE → 0 rows affected, no error.
        expect(rows).toBe(0);
      } finally {
        await prisma.schoolYear.deleteMany({ where: { code } });
      }
    });

    it("Non-SECRETARY role is denied INSERT to academic_term_instances", async () => {
      const syCode = `RLS-DENY-TI-${crypto.randomUUID()}`;
      let syId: string | undefined;
      try {
        const sy = await prisma.schoolYear.create({ data: { code: syCode } });
        syId = sy.id;
        await expect(
          runRlsProbe(RLS_AUTH_UUIDS.FACULTY, async (tx) => {
            await tx.$executeRawUnsafe(
              `INSERT INTO "academic_term_instances" ("school_year_id", "semester", "updated_at") VALUES ($1::uuid, '1ST', now())`,
              sy.id
            );
          })
        ).rejects.toMatchObject({ meta: { code: "42501" } });
      } finally {
        if (syId) {
          await prisma.academicTermInstance.deleteMany({
            where: { school_year_id: syId },
          });
        }
        await prisma.schoolYear.deleteMany({ where: { code: syCode } });
      }
    });

    it("Non-SECRETARY role is denied UPDATE to academic_term_instances", async () => {
      const syCode = `RLS-DENY-TI-UPD-${crypto.randomUUID()}`;
      try {
        const sy = await prisma.schoolYear.create({ data: { code: syCode } });
        try {
          const term = await prisma.academicTermInstance.create({
            data: { school_year_id: sy.id, semester: "FIRST" as const },
          });
          const rows = await runRlsProbe(RLS_AUTH_UUIDS.FACULTY, async (tx) => {
            return tx.$executeRawUnsafe(
              `UPDATE "academic_term_instances" SET "status" = 'COMPLETED' WHERE "id" = $1::uuid`,
              term.id
            );
          });
          // RLS makes the row invisible for UPDATE → 0 rows affected, no error.
          expect(rows).toBe(0);
        } finally {
          await prisma.academicTermInstance.deleteMany({
            where: { school_year_id: sy.id },
          });
        }
      } finally {
        await prisma.schoolYear.deleteMany({ where: { code: syCode } });
      }
    });

    it("proves corrected auth_user_id = auth.uid() linkage behaviorally", async () => {
      // The secretary RLS policy checks `u.auth_user_id = auth.uid()`.
      // If we set auth.uid() to the public users.id PK (which is a different
      // UUID generated by gen_random_uuid()), the policy must NOT match.
      // This proves the corrected join works — the fix fixed the bug.
      const code = `RLS-LINK-${crypto.randomUUID()}`;
      // The public PK of the ADMIN/Secretary user — deliberately NOT the
      // auth UUID. The policy must reject this, proving the correct join.
      const wrongId = U.ADMIN;
      await expect(
        runRlsProbe(wrongId, async (tx) => {
          await tx.$executeRawUnsafe(
            `INSERT INTO "school_years" ("code", "created_at", "updated_at") VALUES ($1, now(), now())`,
            code
          );
        })
      ).rejects.toMatchObject({ meta: { code: "42501" } });
      const row = await prisma.schoolYear.findUnique({ where: { code } });
      expect(row).toBeNull();
    });
  }
);
