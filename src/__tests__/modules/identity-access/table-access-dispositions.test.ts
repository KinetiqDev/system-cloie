import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { RLS_AUTH_UUIDS } from "@/lib/db/rls-test-identities";
import { runAnonProbe, runRlsProbe } from "@/lib/db/rls-test-helpers";
import {
  TABLE_ACCESS_DISPOSITIONS,
  checkTableAccessDispositions,
  listPrismaTableNames,
  type RlsProbeIdentity,
} from "@/lib/db/table-access-dispositions";

/**
 * Live verification of the table access disposition registry against a
 * migrated disposable database (see src/lib/db/table-access-dispositions.ts).
 *
 *   - role-aware-rls / authenticated-read dispositions must carry live policy
 *     evidence: the per-table probe runner below exercises the disposable RLS
 *     harness (fixed Auth identities + auth.uid() GUC stub) and the observed
 *     outcome must match every evidence entry. A new RLS table without a
 *     runner, or with evidence that no longer matches the policies, fails.
 *
 * Requires a disposable database with the canonical migration history applied
 * (scripts/ci/apply-migrations.sh) and the fixture seed (pnpm db:seed).
 */
describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "Table access dispositions (live DB behavior)",
  () => {
    it("registry deterministically covers every Prisma-backed table exactly once", () => {
      const result = checkTableAccessDispositions(listPrismaTableNames());
      expect(result.ok, result.errors.join("\n")).toBe(true);
    });

    type DispositionEntry =
      (typeof TABLE_ACCESS_DISPOSITIONS)[keyof typeof TABLE_ACCESS_DISPOSITIONS];
    type EvidenceBearingDisposition = Extract<
      DispositionEntry,
      { kind: "role-aware-rls" } | { kind: "authenticated-read" }
    >;
    const roleAwareTables = Object.entries(TABLE_ACCESS_DISPOSITIONS).filter(
      (entry): entry is [string, EvidenceBearingDisposition] =>
        entry[1].kind === "role-aware-rls" || entry[1].kind === "authenticated-read"
    );
    const serverOnlyTables = Object.entries(TABLE_ACCESS_DISPOSITIONS).filter(
      ([, disposition]) => disposition.kind === "server-only"
    );

    type LiveProbeResult = { select: boolean; write: boolean };

    function isPermissionDenied(error: unknown): boolean {
      return (
        typeof error === "object" &&
        error !== null &&
        "meta" in error &&
        typeof (error as { meta: { code?: string } }).meta?.code === "string" &&
        (error as { meta: { code: string } }).meta.code === "42501"
      );
    }

    async function probeSelect(table: string, authUid: string): Promise<boolean> {
      try {
        await runRlsProbe(authUid, async (tx) => {
          await tx.$executeRawUnsafe(`SELECT count(*) FROM "${table}"`);
        });
        return true;
      } catch (error) {
        if (!isPermissionDenied(error)) throw error;
        return false;
      }
    }

    /**
     * Run an UPDATE against a fixture row as the identity and report whether
     * it affected the row. RLS denial surfaces as 0 affected rows (UPDATE
     * USING hides the row); a hard 42501 is treated as denied too, anything
     * else rethrows so unexpected failures stay loud.
     */
    async function probeUpdateOutcome(
      authUid: string,
      updateSql: string,
      fixtureId: string
    ): Promise<boolean> {
      try {
        const updated = await runRlsProbe(authUid, async (tx) =>
          tx.$executeRawUnsafe(updateSql, fixtureId)
        );
        return updated === 1;
      } catch (error) {
        if (!isPermissionDenied(error)) throw error;
        return false;
      }
    }

    /** Report whether an INSERT as the identity is denied with 42501. */
    async function probeInsertDenied(
      authUid: string,
      insertSql: string,
      ...args: unknown[]
    ): Promise<boolean> {
      try {
        await runRlsProbe(authUid, async (tx) => {
          await tx.$executeRawUnsafe(insertSql, ...args);
        });
        return false;
      } catch (error) {
        return isPermissionDenied(error);
      }
    }

    /** Report whether a DELETE of the fixture row as the identity affects 0 rows. */
    async function probeDeleteDenied(
      authUid: string,
      table: string,
      fixtureId: string
    ): Promise<boolean> {
      const deleted = await runRlsProbe(authUid, async (tx) =>
        tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "id" = $1::uuid`, fixtureId)
      );
      return deleted === 0;
    }

    async function expectAnonSelectDenied(table: string): Promise<void> {
      await expect(
        runAnonProbe((tx) => tx.$executeRawUnsafe(`SELECT count(*) FROM "${table}"`))
      ).rejects.toMatchObject({ meta: { code: "42501" } });
    }

    async function expectAnonInsertDenied(table: string): Promise<void> {
      await expect(
        runAnonProbe((tx) => tx.$executeRawUnsafe(`INSERT INTO "${table}" DEFAULT VALUES`))
      ).rejects.toMatchObject({ meta: { code: "42501" } });
    }

    async function expectAuthenticatedSelectDenied(table: string): Promise<void> {
      await expect(
        runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, (tx) =>
          tx.$executeRawUnsafe(`SELECT count(*) FROM "${table}"`)
        )
      ).rejects.toMatchObject({ meta: { code: "42501" } });
    }

    async function expectAuthenticatedInsertDenied(table: string): Promise<void> {
      await expect(
        runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, (tx) =>
          tx.$executeRawUnsafe(`INSERT INTO "${table}" DEFAULT VALUES`)
        )
      ).rejects.toMatchObject({ meta: { code: "42501" } });
    }

    async function expectAnonReadsZeroRows(table: string): Promise<void> {
      const rows = await runAnonProbe(async (tx) =>
        tx.$queryRawUnsafe<{ count: bigint }[]>(`SELECT count(*) FROM "${table}"`)
      );
      expect(Number(rows[0].count)).toBe(0);
    }

    /**
     * Write probe shape: create a fixture row (as the probed identity when it
     * is a writer, otherwise as SECRETARY), then attempt an UPDATE of that row
     * as the probed identity. RLS denial surfaces as 0 affected rows (UPDATE
     * USING hides the row) or error 42501 (INSERT WITH CHECK).
     */
    const CALENDAR_WRITERS: Record<RlsProbeIdentity, boolean> = {
      SECRETARY: true,
      PROGRAM_HEAD_BSIT: false,
      FACULTY: false,
    };

    async function probeCalendarTable(
      table: "school_years" | "academic_term_instances",
      identity: RlsProbeIdentity
    ): Promise<LiveProbeResult> {
      const authUid = RLS_AUTH_UUIDS[identity];
      const code = `RLS-PROBE-${crypto.randomUUID()}`;

      const parent = await prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "school_years" ORDER BY "created_at" ASC LIMIT 1`;
      expect(parent[0], "seeded school year required for term instance fixture").toBeTruthy();

      const createRow = (asUid: string): Promise<string> =>
        runRlsProbe(asUid, async (tx) => {
          const rows =
            table === "school_years"
              ? await tx.$queryRawUnsafe<{ id: string }[]>(
                  `INSERT INTO "school_years" ("code", "updated_at") VALUES ($1, now()) RETURNING "id"`,
                  code
                )
              : await tx.$queryRawUnsafe<{ id: string }[]>(
                  `INSERT INTO "academic_term_instances" ("school_year_id", "semester", "term", "updated_at") VALUES ($1::uuid, 'SUMMER', 'FIRST_TERM', now()) RETURNING "id"`,
                  parent[0].id
                );
          return rows[0].id;
        });

      const select = await probeSelect(table, authUid);

      let fixtureId: string;
      try {
        fixtureId = CALENDAR_WRITERS[identity]
          ? await createRow(authUid)
          : await createRow(RLS_AUTH_UUIDS.SECRETARY);
      } catch (error) {
        if (!isPermissionDenied(error)) throw error;
        return { select, write: false };
      }

      const updateSql = `UPDATE "${table}" SET "end_date" = now() WHERE "id" = $1::uuid`;
      let write = false;
      try {
        if (CALENDAR_WRITERS[identity]) {
          write = await probeUpdateOutcome(authUid, updateSql, fixtureId);
        } else {
          // Denied identities: every write command must fail — UPDATE/DELETE
          // affect zero rows (USING hides the row), INSERT throws 42501.
          const updateDenied = !(await probeUpdateOutcome(authUid, updateSql, fixtureId));
          let insertDenied: boolean;
          let preparedParentId: string | null = null;
          try {
            if (table === "academic_term_instances") {
              // Fresh parent school year so the denied INSERT targets a unique
              // (school_year_id, semester, term) combination.
              preparedParentId = await runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, async (tx) => {
                const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
                  `INSERT INTO "school_years" ("code", "updated_at") VALUES ($1, now()) RETURNING "id"`,
                  `RLS-PROBE-${crypto.randomUUID()}`
                );
                return rows[0].id;
              });
              insertDenied = await probeInsertDenied(
                authUid,
                `INSERT INTO "academic_term_instances" ("school_year_id", "semester", "term", "updated_at") VALUES ($1::uuid, 'SUMMER', 'FIRST_TERM', now())`,
                preparedParentId
              );
            } else {
              insertDenied = await probeInsertDenied(
                authUid,
                `INSERT INTO "school_years" ("code", "updated_at") VALUES ($1, now())`,
                `RLS-PROBE-${crypto.randomUUID()}`
              );
            }
          } finally {
            if (preparedParentId !== null) {
              await prisma.$executeRawUnsafe(
                `DELETE FROM "school_years" WHERE "id" = $1::uuid`,
                preparedParentId
              );
            }
          }
          const deleteDenied = await probeDeleteDenied(authUid, table, fixtureId);
          write = !(updateDenied && insertDenied && deleteDenied);
        }
      } finally {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "id" = $1::uuid`, fixtureId);
      }
      return { select, write };
    }

    const CURRICULUM_WRITERS: Record<RlsProbeIdentity, boolean> = {
      SECRETARY: true,
      PROGRAM_HEAD_BSIT: true,
      FACULTY: false,
    };

    /**
     * Authenticated-read tables: every authenticated identity may SELECT every
     * row (read policy USING true), while every write command is denied —
     * UPDATE/DELETE affect zero rows because no policies exist, INSERT throws
     * 42501. `updateColumn` is a real column whose value is rewritten to
     * itself so the statement is a no-op when it reaches a row.
     */
    async function probeAuthenticatedReadTable(
      table: string,
      updateColumn: string,
      identity: RlsProbeIdentity
    ): Promise<LiveProbeResult> {
      const authUid = RLS_AUTH_UUIDS[identity];
      const select = await probeSelect(table, authUid);

      const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT "id" FROM "${table}" LIMIT 1`
      );
      expect(rows[0], `seeded row required for ${table} write probe`).toBeTruthy();

      const updateDenied = !(await probeUpdateOutcome(
        authUid,
        `UPDATE "${table}" SET "${updateColumn}" = "${updateColumn}" WHERE "id" = $1::uuid`,
        rows[0].id
      ));
      const insertDenied = await probeInsertDenied(
        authUid,
        `INSERT INTO "${table}" DEFAULT VALUES`
      );
      const deleteDenied = await probeDeleteDenied(authUid, table, rows[0].id);
      return { select, write: !(updateDenied && insertDenied && deleteDenied) };
    }

    async function probeCurriculumVersions(identity: RlsProbeIdentity): Promise<LiveProbeResult> {
      const authUid = RLS_AUTH_UUIDS[identity];
      const code = `RLS-PROBE-CV-${crypto.randomUUID()}`;

      const program = await prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "programs" WHERE "code" = 'BSIT' LIMIT 1`;
      expect(program[0], "seeded BSIT program required for curriculum fixture").toBeTruthy();

      const select = await probeSelect("curriculum_versions", authUid);

      const createVersion = (asUid: string): Promise<string> =>
        runRlsProbe(asUid, async (tx) => {
          const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
            `INSERT INTO "curriculum_versions" ("program_id", "code", "name", "status", "updated_at") VALUES ($1::uuid, $2, 'RLS probe', 'DRAFT', now()) RETURNING "id"`,
            program[0].id,
            code
          );
          return rows[0].id;
        });

      let versionId: string;
      try {
        versionId = CURRICULUM_WRITERS[identity]
          ? await createVersion(authUid)
          : await createVersion(RLS_AUTH_UUIDS.SECRETARY);
      } catch (error) {
        if (!isPermissionDenied(error)) throw error;
        return { select, write: false };
      }

      const updateSql = `UPDATE "curriculum_versions" SET "name" = 'renamed by probe' WHERE "id" = $1::uuid`;
      let write = false;
      try {
        if (CURRICULUM_WRITERS[identity]) {
          write = await probeUpdateOutcome(authUid, updateSql, versionId);
        } else {
          const updateDenied = !(await probeUpdateOutcome(authUid, updateSql, versionId));
          const insertDenied = await probeInsertDenied(
            authUid,
            `INSERT INTO "curriculum_versions" ("program_id", "code", "name", "status", "updated_at") VALUES ($1::uuid, $2, 'RLS probe', 'DRAFT', now())`,
            program[0].id,
            `RLS-PROBE-${crypto.randomUUID()}`
          );
          const deleteDenied = await probeDeleteDenied(authUid, "curriculum_versions", versionId);
          write = !(updateDenied && insertDenied && deleteDenied);
        }
      } finally {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "curriculum_versions" WHERE "id" = $1::uuid`,
          versionId
        );
      }
      return { select, write };
    }

    async function probeCurriculumCourses(identity: RlsProbeIdentity): Promise<LiveProbeResult> {
      const authUid = RLS_AUTH_UUIDS[identity];

      const program = await prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "programs" WHERE "code" = 'BSIT' LIMIT 1`;
      expect(program[0], "seeded BSIT program required for curriculum fixture").toBeTruthy();

      const course = await prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "courses" ORDER BY "created_at" ASC LIMIT 1`;
      expect(course[0], "seeded course required for curriculum fixture").toBeTruthy();

      const select = await probeSelect("curriculum_courses", authUid);

      // Parent DRAFT version + course row, both created by the identity when
      // it is a writer; otherwise both are created by SECRETARY so the probed
      // identity has a real row to target with UPDATE.
      const createFixture = async (
        asUid: string
      ): Promise<{ courseId: string; versionId: string }> => {
        const versionRows = await runRlsProbe(asUid, async (tx) =>
          tx.$queryRawUnsafe<{ id: string }[]>(
            `INSERT INTO "curriculum_versions" ("program_id", "code", "name", "status", "updated_at") VALUES ($1::uuid, $2, 'RLS probe', 'DRAFT', now()) RETURNING "id"`,
            program[0].id,
            `RLS-PROBE-PARENT-${crypto.randomUUID()}`
          )
        );
        const versionId = versionRows[0].id;
        const courseRows = await runRlsProbe(asUid, async (tx) =>
          tx.$queryRawUnsafe<{ id: string }[]>(
            `INSERT INTO "curriculum_courses" ("curriculum_version_id", "course_id", "year_level", "semester", "term", "course_code_snapshot", "course_title_snapshot", "updated_at") VALUES ($1::uuid, $2::uuid, 'FIRST_YEAR', '1ST', 'FIRST_TERM', 'PROBE', 'Probe course', now()) RETURNING "id"`,
            versionId,
            course[0].id
          )
        );
        return { courseId: courseRows[0].id, versionId };
      };

      let fixture: { courseId: string; versionId: string };
      try {
        fixture = CURRICULUM_WRITERS[identity]
          ? await createFixture(authUid)
          : await createFixture(RLS_AUTH_UUIDS.SECRETARY);
      } catch (error) {
        if (!isPermissionDenied(error)) throw error;
        await prisma.$executeRawUnsafe(
          `DELETE FROM "curriculum_courses" WHERE "course_code_snapshot" = 'PROBE'`
        );
        await prisma.$executeRawUnsafe(
          `DELETE FROM "curriculum_versions" WHERE "name" = 'RLS probe' AND "code" LIKE 'RLS-PROBE-PARENT-%'`
        );
        return { select, write: false };
      }

      const updateSql = `UPDATE "curriculum_courses" SET "course_code_snapshot" = 'RENAMED' WHERE "id" = $1::uuid`;
      let write = false;
      try {
        if (CURRICULUM_WRITERS[identity]) {
          write = await probeUpdateOutcome(authUid, updateSql, fixture.courseId);
        } else {
          const updateDenied = !(await probeUpdateOutcome(authUid, updateSql, fixture.courseId));
          // Fresh parent DRAFT version so the denied INSERT targets a unique
          // parent; the course INSERT as the denied identity must throw 42501.
          const preparedVersionId = await runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, async (tx) => {
            const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
              `INSERT INTO "curriculum_versions" ("program_id", "code", "name", "status", "updated_at") VALUES ($1::uuid, $2, 'RLS probe', 'DRAFT', now()) RETURNING "id"`,
              program[0].id,
              `RLS-PROBE-PARENT-${crypto.randomUUID()}`
            );
            return rows[0].id;
          });
          let insertDenied: boolean;
          try {
            insertDenied = await probeInsertDenied(
              authUid,
              `INSERT INTO "curriculum_courses" ("curriculum_version_id", "course_id", "year_level", "semester", "term", "course_code_snapshot", "course_title_snapshot", "updated_at") VALUES ($1::uuid, $2::uuid, 'FIRST_YEAR', '1ST', 'FIRST_TERM', 'PROBE', 'Probe course', now())`,
              preparedVersionId,
              course[0].id
            );
          } finally {
            await prisma.$executeRawUnsafe(
              `DELETE FROM "curriculum_versions" WHERE "id" = $1::uuid`,
              preparedVersionId
            );
          }
          const deleteDenied = await probeDeleteDenied(
            authUid,
            "curriculum_courses",
            fixture.courseId
          );
          write = !(updateDenied && insertDenied && deleteDenied);
        }
      } finally {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "curriculum_courses" WHERE "id" = $1::uuid`,
          fixture.courseId
        );
        await prisma.$executeRawUnsafe(
          `DELETE FROM "curriculum_versions" WHERE "id" = $1::uuid`,
          fixture.versionId
        );
      }
      return { select, write };
    }

    describe("role-aware and authenticated-read dispositions carry live policy evidence", () => {
      const LIVE_PROBE_RUNNERS: Record<
        string,
        (identity: RlsProbeIdentity) => Promise<LiveProbeResult>
      > = {
        school_years: probeCalendarTable.bind(null, "school_years"),
        academic_term_instances: probeCalendarTable.bind(null, "academic_term_instances"),
        curriculum_versions: probeCurriculumVersions,
        curriculum_courses: probeCurriculumCourses,
        users: probeAuthenticatedReadTable.bind(null, "users", "name"),
        user_roles: probeAuthenticatedReadTable.bind(null, "user_roles", "role"),
        program_head_assignments: probeAuthenticatedReadTable.bind(
          null,
          "program_head_assignments",
          "is_active"
        ),
      };

      for (const [table, disposition] of roleAwareTables) {
        describe(`table ${table}`, () => {
          it("has a live probe runner backing its evidence", () => {
            expect(
              LIVE_PROBE_RUNNERS[table],
              `no live probe runner for "${table}" — add one so the disposition references live policy evidence`
            ).toBeTruthy();
          });

          for (const evidence of disposition.evidence) {
            it(`identity ${evidence.identity}: ${evidence.operation} is ${evidence.expect}`, async () => {
              const runner = LIVE_PROBE_RUNNERS[table];
              expect(runner, `no live probe runner for "${table}"`).toBeTruthy();
              const live = await runner(evidence.identity);
              const observed = live[evidence.operation];
              expect(
                observed,
                `${table}: expected ${evidence.operation} for identity ${evidence.identity} to be ${evidence.expect}, got ${observed ? "allowed" : "denied"}`
              ).toBe(evidence.expect === "allowed");
            });
          }
        });
      }
    });

    describe("authenticated-read tables deny anon reads and authenticated writes", () => {
      const authenticatedReadTables = Object.entries(TABLE_ACCESS_DISPOSITIONS).filter(
        ([, disposition]) => disposition.kind === "authenticated-read"
      );

      it("registers at least one authenticated-read table", () => {
        expect(authenticatedReadTables.length).toBeGreaterThan(0);
      });

      for (const [table] of authenticatedReadTables) {
        describe(`table ${table}`, () => {
          it("returns zero rows to anon", () => expectAnonReadsZeroRows(table));

          it("denies authenticated INSERT", () => expectAuthenticatedInsertDenied(table));
        });
      }
    });

    describe("server-only tables deny anon and authenticated directly", () => {
      it("registers at least one server-only table", () => {
        expect(serverOnlyTables.length).toBeGreaterThan(0);
      });

      for (const [table] of serverOnlyTables) {
        describe(`table ${table}`, () => {
          it("denies anon SELECT", () => expectAnonSelectDenied(table));

          it("denies anon INSERT", () => expectAnonInsertDenied(table));

          it("denies authenticated SELECT", () => expectAuthenticatedSelectDenied(table));

          it("denies authenticated INSERT", () => expectAuthenticatedInsertDenied(table));
        });
      }
    });
  }
);
