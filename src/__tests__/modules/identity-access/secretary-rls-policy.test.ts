import { afterEach, describe, it, expect } from "vitest";
import crypto from "node:crypto";

import { SystemRole } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { RLS_AUTH_UUIDS } from "@/lib/db/rls-test-identities";
import { runAnonProbe, runRlsProbe } from "@/lib/db/rls-test-helpers";

const CALENDAR_TABLES = ["school_years", "academic_term_instances"] as const;

/**
 * Purpose-built accounts for the identities the old role-join policy wrongly
 * honoured. Each owns a fixed Auth UUID so `auth.uid()` resolves to it through
 * the disposable harness GUC stub. The seeded demo accounts are never mutated,
 * so later suites see the fixture exactly as seeded.
 */
const PROBE_ACCOUNTS = {
  DEACTIVATED_SECRETARY: {
    authUid: "00000000-0000-4000-8000-000000000003",
    email: "rls-deactivated-secretary@cloie.test",
  },
  MULTI_ROLE_SECRETARY: {
    authUid: "00000000-0000-4000-8000-000000000004",
    email: "rls-multi-role-secretary@cloie.test",
  },
} as const;

describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "Academic calendar database boundary (live DB behavior)",
  () => {
    // The deactivated and multi-role accounts are created per test to prove the
    // boundary refuses exactly the identities the old role join honoured; both
    // are reverted afterwards so the fixture database stays as seeded.
    afterEach(async () => {
      await removeProbeAccounts();
    });

    /**
     * Create (or refresh) one probe account with its Auth link and roles. Kept
     * out of the seed so the disposable database needs no new fixture for a
     * boundary that must refuse every identity.
     */
    async function createProbeAccount(
      account: { authUid: string; email: string },
      input: { name: string; isActive: boolean; roles: SystemRole[] }
    ): Promise<{ authUid: string }> {
      const user = await prisma.user.upsert({
        where: { email: account.email },
        update: { name: input.name, is_active: input.isActive, auth_user_id: account.authUid },
        create: {
          email: account.email,
          name: input.name,
          is_active: input.isActive,
          auth_user_id: account.authUid,
        },
      });
      for (const role of input.roles) {
        await prisma.userRole.upsert({
          where: { user_id_role: { user_id: user.id, role } },
          update: {},
          create: { user_id: user.id, role },
        });
      }
      return { authUid: account.authUid };
    }

    /**
     * Every identity the calendar boundary must refuse, including the ones the
     * old role-join policy wrongly honoured: a linked Secretary account that is
     * deactivated, and a real multi-role holder who holds a SECRETARY row
     * without being in the Secretary workspace. Both are derived per test from
     * the Auth UUIDs the disposable harness already stubs, so no seed fixture
     * is added for a boundary that must refuse everyone.
     */
    async function calendarDenialIdentities(): Promise<{ label: string; uid: string }[]> {
      const identities: { label: string; uid: string }[] = [
        { label: "SECRETARY", uid: RLS_AUTH_UUIDS.SECRETARY },
        { label: "FACULTY", uid: RLS_AUTH_UUIDS.FACULTY },
        { label: "PROGRAM_HEAD_BSIT", uid: RLS_AUTH_UUIDS.PROGRAM_HEAD_BSIT },
      ];

      // A linked SECRETARY whose account is deactivated. The old policy matched
      // it because it never read users.is_active.
      const deactivated = await createProbeAccount(PROBE_ACCOUNTS.DEACTIVATED_SECRETARY, {
        name: "RLS Deactivated Secretary",
        isActive: false,
        roles: [SystemRole.SECRETARY],
      });
      identities.push({
        label: "DEACTIVATED_SECRETARY",
        uid: deactivated.authUid,
      });

      // A linked, active account holding SECRETARY and FACULTY: the multi-role
      // shape the server resolves an active role for. The old policy matched it
      // on role alone, with no workspace decision.
      const multiRole = await createProbeAccount(PROBE_ACCOUNTS.MULTI_ROLE_SECRETARY, {
        name: "RLS Multi-Role Secretary",
        isActive: true,
        roles: [SystemRole.SECRETARY, SystemRole.FACULTY],
      });
      identities.push({ label: "MULTI_ROLE_SECRETARY", uid: multiRole.authUid });

      return identities;
    }

    /** Remove every probe account this suite created; seeded rows are untouched. */
    async function removeProbeAccounts(): Promise<void> {
      await prisma.user.deleteMany({
        where: { email: { in: Object.values(PROBE_ACCOUNTS).map((account) => account.email) } },
      });
    }

    async function fixtureSchoolYearCode(): Promise<string> {
      return `RLS-CAL-${crypto.randomUUID()}`;
    }

    async function cleanupSchoolYear(code: string): Promise<void> {
      const sy = await prisma.schoolYear.findUnique({ where: { code } });
      if (!sy) return;
      await prisma.academicTermInstance.deleteMany({ where: { school_year_id: sy.id } });
      await prisma.schoolYear.delete({ where: { id: sy.id } });
    }

    it("refuses every direct SELECT on school_years, including for a linked Secretary", async () => {
      for (const identity of await calendarDenialIdentities()) {
        await expect(
          runRlsProbe(identity.uid, (tx) =>
            tx.$executeRawUnsafe(`SELECT count(*) FROM "school_years"`)
          ),
          `${identity.label} must not read school_years directly`
        ).rejects.toMatchObject({ meta: { code: "42501" } });
      }
    });

    it("refuses every direct SELECT on academic_term_instances, including for a linked Secretary", async () => {
      for (const identity of await calendarDenialIdentities()) {
        await expect(
          runRlsProbe(identity.uid, (tx) =>
            tx.$executeRawUnsafe(`SELECT count(*) FROM "academic_term_instances"`)
          ),
          `${identity.label} must not read academic_term_instances directly`
        ).rejects.toMatchObject({ meta: { code: "42501" } });
      }
    });

    it("refuses direct INSERT on school_years for every calendar identity", async () => {
      for (const identity of await calendarDenialIdentities()) {
        const code = await fixtureSchoolYearCode();
        try {
          await expect(
            runRlsProbe(identity.uid, (tx) =>
              tx.$executeRawUnsafe(
                `INSERT INTO "school_years" ("code", "created_at", "updated_at") VALUES ($1, now(), now())`,
                code
              )
            ),
            `${identity.label} must not insert school_years directly`
          ).rejects.toMatchObject({ meta: { code: "42501" } });
        } finally {
          await cleanupSchoolYear(code);
        }
      }
    });

    it("refuses direct UPDATE on school_years for every calendar identity", async () => {
      for (const identity of await calendarDenialIdentities()) {
        const code = await fixtureSchoolYearCode();
        try {
          const sy = await prisma.schoolYear.create({ data: { code } });
          await expect(
            runRlsProbe(identity.uid, (tx) =>
              tx.$executeRawUnsafe(
                `UPDATE "school_years" SET "start_date" = '2026-01-01' WHERE "id" = $1::uuid`,
                sy.id
              )
            ),
            `${identity.label} must not update school_years directly`
          ).rejects.toMatchObject({ meta: { code: "42501" } });
        } finally {
          await cleanupSchoolYear(code);
        }
      }
    });

    it("refuses direct DELETE on school_years for every calendar identity", async () => {
      for (const identity of await calendarDenialIdentities()) {
        const code = await fixtureSchoolYearCode();
        try {
          const sy = await prisma.schoolYear.create({ data: { code } });
          await expect(
            runRlsProbe(identity.uid, (tx) =>
              tx.$executeRawUnsafe(`DELETE FROM "school_years" WHERE "id" = $1::uuid`, sy.id)
            ),
            `${identity.label} must not delete school_years directly`
          ).rejects.toMatchObject({ meta: { code: "42501" } });
        } finally {
          await cleanupSchoolYear(code);
        }
      }
    });

    it("refuses direct INSERT on academic_term_instances for every calendar identity", async () => {
      for (const identity of await calendarDenialIdentities()) {
        const parent = await prisma.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "school_years" ORDER BY "created_at" ASC LIMIT 1`;
        expect(parent[0], "seeded school year required for term instance fixture").toBeTruthy();
        await expect(
          runRlsProbe(identity.uid, (tx) =>
            tx.$executeRawUnsafe(
              `INSERT INTO "academic_term_instances" ("school_year_id", "semester", "term", "updated_at") VALUES ($1::uuid, 'SUMMER', NULL, now())`,
              parent[0].id
            )
          ),
          `${identity.label} must not insert academic_term_instances directly`
        ).rejects.toMatchObject({ meta: { code: "42501" } });
      }
    });

    it("refuses direct UPDATE on academic_term_instances for every calendar identity", async () => {
      for (const identity of await calendarDenialIdentities()) {
        const code = await fixtureSchoolYearCode();
        try {
          const sy = await prisma.schoolYear.create({ data: { code } });
          const term = await prisma.academicTermInstance.create({
            data: { school_year_id: sy.id, semester: "SUMMER" as const, term: null },
          });
          await expect(
            runRlsProbe(identity.uid, (tx) =>
              tx.$executeRawUnsafe(
                `UPDATE "academic_term_instances" SET "status" = 'COMPLETED' WHERE "id" = $1::uuid`,
                term.id
              )
            ),
            `${identity.label} must not update academic_term_instances directly`
          ).rejects.toMatchObject({ meta: { code: "42501" } });
        } finally {
          await cleanupSchoolYear(code);
        }
      }
    });

    it("refuses direct DELETE on academic_term_instances for every calendar identity", async () => {
      for (const identity of await calendarDenialIdentities()) {
        const code = await fixtureSchoolYearCode();
        try {
          const sy = await prisma.schoolYear.create({ data: { code } });
          const term = await prisma.academicTermInstance.create({
            data: { school_year_id: sy.id, semester: "SUMMER" as const, term: null },
          });
          await expect(
            runRlsProbe(identity.uid, (tx) =>
              tx.$executeRawUnsafe(
                `DELETE FROM "academic_term_instances" WHERE "id" = $1::uuid`,
                term.id
              )
            ),
            `${identity.label} must not delete academic_term_instances directly`
          ).rejects.toMatchObject({ meta: { code: "42501" } });
        } finally {
          await cleanupSchoolYear(code);
        }
      }
    });

    it("refuses anon reads and writes on both calendar tables", async () => {
      for (const table of CALENDAR_TABLES) {
        await expect(
          runAnonProbe((tx) => tx.$executeRawUnsafe(`SELECT count(*) FROM "${table}"`)),
          `anon must not read ${table}`
        ).rejects.toMatchObject({ meta: { code: "42501" } });
        await expect(
          runAnonProbe((tx) => tx.$executeRawUnsafe(`INSERT INTO "${table}" DEFAULT VALUES`)),
          `anon must not write ${table}`
        ).rejects.toMatchObject({ meta: { code: "42501" } });
      }
    });

    it("keeps the authorized Prisma server path functional", async () => {
      // The calendar must remain writable through the service-role connection
      // the lifecycle services use; the boundary above only closes direct
      // anon/authenticated access.
      const code = await fixtureSchoolYearCode();
      try {
        const sy = await prisma.schoolYear.create({
          data: { code, start_date: new Date("2026-06-01") },
        });
        const term = await prisma.academicTermInstance.create({
          data: { school_year_id: sy.id, semester: "SUMMER" as const, term: null },
        });
        const updated = await prisma.schoolYear.update({
          where: { id: sy.id },
          data: { end_date: new Date("2027-05-31") },
        });
        expect(updated.end_date?.toISOString()).toBe("2027-05-31T00:00:00.000Z");
        const storedTerm = await prisma.academicTermInstance.findUnique({
          where: { id: term.id },
          include: { school_year: true },
        });
        expect(storedTerm?.school_year.end_date?.toISOString()).toBe("2027-05-31T00:00:00.000Z");
      } finally {
        await cleanupSchoolYear(code);
      }
    });
  }
);
