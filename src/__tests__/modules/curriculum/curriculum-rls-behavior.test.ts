import crypto from "node:crypto";
import { CurriculumVersionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { RLS_AUTH_UUIDS } from "@/lib/db/rls-test-identities";
import { runRlsProbe } from "@/lib/db/rls-test-helpers";

/**
 * Live RLS probes against the disposable database for the curriculum write
 * policies (20260809062932 → 20260809070000 → 20260811063000).
 *
 * The policy matrix under test:
 *   - SECRETARY: write access to DRAFT curriculum rows (any program)
 *   - PROGRAM_HEAD: write access to DRAFT rows of assigned programs only
 *   - PUBLISHED/RETIRED rows: read-only for every authenticated role
 *   - Every other role: no curriculum write access
 *
 * RLS denial semantics differ by command:
 *   - INSERT: WITH CHECK failure → error 42501
 *   - UPDATE/DELETE: USING failure hides the row → 0 rows affected
 */
describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "Curriculum RLS Policies (live DB behavior)",
  () => {
    async function findProgram(code: string) {
      const program = await prisma.program.findUnique({ where: { code } });
      expect(program).toBeTruthy();
      return program!;
    }

    async function fixtureVersion(programId: string, status: CurriculumVersionStatus) {
      const version = await prisma.curriculumVersion.create({
        data: {
          program_id: programId,
          code: `RLS-CV-${crypto.randomUUID()}`,
          name: "RLS probe version",
          status,
        },
      });
      return version;
    }

    async function cleanupVersions(versionIds: string[]) {
      await prisma.curriculumCourse.deleteMany({
        where: { curriculum_version_id: { in: versionIds } },
      });
      await prisma.curriculumVersion.deleteMany({ where: { id: { in: versionIds } } });
    }

    describe("Secretary curriculum access", () => {
      it("can INSERT a DRAFT curriculum version", async () => {
        const bsit = await findProgram("BSIT");
        const code = `RLS-CV-${crypto.randomUUID()}`;
        try {
          await runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, async (tx) => {
            await tx.$executeRawUnsafe(
              `INSERT INTO "curriculum_versions" ("program_id", "code", "name", "status", "updated_at") VALUES ($1::uuid, $2, $3, 'DRAFT', now())`,
              bsit.id,
              code,
              "RLS probe"
            );
          });
        } finally {
          await prisma.curriculumVersion.deleteMany({ where: { code } });
        }
      });

      it("can UPDATE and DELETE a DRAFT curriculum version", async () => {
        const bsit = await findProgram("BSIT");
        const version = await fixtureVersion(bsit.id, CurriculumVersionStatus.DRAFT);
        try {
          const updated = await runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, async (tx) =>
            tx.$executeRawUnsafe(
              `UPDATE "curriculum_versions" SET "name" = $2 WHERE "id" = $1::uuid`,
              version.id,
              "renamed by secretary"
            )
          );
          expect(updated).toBe(1);

          const deleted = await runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, async (tx) =>
            tx.$executeRawUnsafe(
              `DELETE FROM "curriculum_versions" WHERE "id" = $1::uuid`,
              version.id
            )
          );
          expect(deleted).toBe(1);
        } finally {
          await cleanupVersions([version.id]);
        }
      });

      it("cannot INSERT a non-DRAFT curriculum version (WITH CHECK)", async () => {
        const bsit = await findProgram("BSIT");
        const code = `RLS-CV-${crypto.randomUUID()}`;
        await expect(
          runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, async (tx) => {
            await tx.$executeRawUnsafe(
              `INSERT INTO "curriculum_versions" ("program_id", "code", "name", "status", "updated_at") VALUES ($1::uuid, $2, $3, 'PUBLISHED', now())`,
              bsit.id,
              code,
              "should be blocked"
            );
          })
        ).rejects.toMatchObject({ meta: { code: "42501" } });
        const row = await prisma.curriculumVersion.findFirst({ where: { code } });
        expect(row).toBeNull();
      });

      it("cannot transition a DRAFT version to PUBLISHED via UPDATE (WITH CHECK)", async () => {
        const bsit = await findProgram("BSIT");
        const version = await fixtureVersion(bsit.id, CurriculumVersionStatus.DRAFT);
        try {
          await expect(
            runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, async (tx) =>
              tx.$executeRawUnsafe(
                `UPDATE "curriculum_versions" SET "status" = 'PUBLISHED' WHERE "id" = $1::uuid`,
                version.id
              )
            )
          ).rejects.toMatchObject({ meta: { code: "42501" } });
        } finally {
          await cleanupVersions([version.id]);
        }
      });
    });

    describe("Program Head curriculum access (in-scope)", () => {
      it("can INSERT a DRAFT curriculum version for an assigned program", async () => {
        const bsit = await findProgram("BSIT");
        const code = `RLS-CV-${crypto.randomUUID()}`;
        try {
          await runRlsProbe(RLS_AUTH_UUIDS.PROGRAM_HEAD_BSIT, async (tx) => {
            await tx.$executeRawUnsafe(
              `INSERT INTO "curriculum_versions" ("program_id", "code", "name", "status", "updated_at") VALUES ($1::uuid, $2, $3, 'DRAFT', now())`,
              bsit.id,
              code,
              "RLS probe"
            );
          });
        } finally {
          await prisma.curriculumVersion.deleteMany({ where: { code } });
        }
      });

      it("can UPDATE and DELETE a DRAFT version of an assigned program", async () => {
        const bsit = await findProgram("BSIT");
        const version = await fixtureVersion(bsit.id, CurriculumVersionStatus.DRAFT);
        try {
          const updated = await runRlsProbe(RLS_AUTH_UUIDS.PROGRAM_HEAD_BSIT, async (tx) =>
            tx.$executeRawUnsafe(
              `UPDATE "curriculum_versions" SET "name" = $2 WHERE "id" = $1::uuid`,
              version.id,
              "renamed by ph"
            )
          );
          expect(updated).toBe(1);

          const deleted = await runRlsProbe(RLS_AUTH_UUIDS.PROGRAM_HEAD_BSIT, async (tx) =>
            tx.$executeRawUnsafe(
              `DELETE FROM "curriculum_versions" WHERE "id" = $1::uuid`,
              version.id
            )
          );
          expect(deleted).toBe(1);
        } finally {
          await cleanupVersions([version.id]);
        }
      });
    });

    describe("Program Head cross-Program denial", () => {
      it("cannot INSERT a DRAFT version for a program outside the assigned set", async () => {
        const bsed = await findProgram("BSED");
        const code = `RLS-CV-${crypto.randomUUID()}`;
        await expect(
          runRlsProbe(RLS_AUTH_UUIDS.PROGRAM_HEAD_BSIT, async (tx) => {
            await tx.$executeRawUnsafe(
              `INSERT INTO "curriculum_versions" ("program_id", "code", "name", "status", "updated_at") VALUES ($1::uuid, $2, $3, 'DRAFT', now())`,
              bsed.id,
              code,
              "cross-program probe"
            );
          })
        ).rejects.toMatchObject({ meta: { code: "42501" } });
        const row = await prisma.curriculumVersion.findFirst({ where: { code } });
        expect(row).toBeNull();
      });

      it("cannot UPDATE or DELETE a DRAFT version of a program outside the assigned set", async () => {
        const bsed = await findProgram("BSED");
        const version = await fixtureVersion(bsed.id, CurriculumVersionStatus.DRAFT);
        try {
          const updated = await runRlsProbe(RLS_AUTH_UUIDS.PROGRAM_HEAD_BSIT, async (tx) =>
            tx.$executeRawUnsafe(
              `UPDATE "curriculum_versions" SET "name" = $2 WHERE "id" = $1::uuid`,
              version.id,
              "should be invisible"
            )
          );
          expect(updated).toBe(0);

          const deleted = await runRlsProbe(RLS_AUTH_UUIDS.PROGRAM_HEAD_BSIT, async (tx) =>
            tx.$executeRawUnsafe(
              `DELETE FROM "curriculum_versions" WHERE "id" = $1::uuid`,
              version.id
            )
          );
          expect(deleted).toBe(0);
        } finally {
          await cleanupVersions([version.id]);
        }
      });
    });

    describe("PUBLISHED and RETIRED write denial", () => {
      it("denies UPDATE and DELETE of a PUBLISHED version to Secretary and in-scope Program Head", async () => {
        const bsit = await findProgram("BSIT");
        const version = await fixtureVersion(bsit.id, CurriculumVersionStatus.PUBLISHED);
        try {
          for (const authUid of [RLS_AUTH_UUIDS.SECRETARY, RLS_AUTH_UUIDS.PROGRAM_HEAD_BSIT]) {
            const updated = await runRlsProbe(authUid, async (tx) =>
              tx.$executeRawUnsafe(
                `UPDATE "curriculum_versions" SET "name" = $2 WHERE "id" = $1::uuid`,
                version.id,
                "must not touch published"
              )
            );
            expect(updated, `update denial failed for ${authUid}`).toBe(0);

            const deleted = await runRlsProbe(authUid, async (tx) =>
              tx.$executeRawUnsafe(
                `DELETE FROM "curriculum_versions" WHERE "id" = $1::uuid`,
                version.id
              )
            );
            expect(deleted, `delete denial failed for ${authUid}`).toBe(0);
          }
        } finally {
          await cleanupVersions([version.id]);
        }
      });

      it("denies UPDATE and DELETE of a RETIRED version to Secretary", async () => {
        const bsit = await findProgram("BSIT");
        const version = await fixtureVersion(bsit.id, CurriculumVersionStatus.RETIRED);
        try {
          const updated = await runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, async (tx) =>
            tx.$executeRawUnsafe(
              `UPDATE "curriculum_versions" SET "name" = $2 WHERE "id" = $1::uuid`,
              version.id,
              "must not touch retired"
            )
          );
          expect(updated).toBe(0);

          const deleted = await runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, async (tx) =>
            tx.$executeRawUnsafe(
              `DELETE FROM "curriculum_versions" WHERE "id" = $1::uuid`,
              version.id
            )
          );
          expect(deleted).toBe(0);
        } finally {
          await cleanupVersions([version.id]);
        }
      });
    });

    describe("Unauthorized role denial", () => {
      it("cannot INSERT, UPDATE, or DELETE curriculum versions", async () => {
        const bsit = await findProgram("BSIT");
        const version = await fixtureVersion(bsit.id, CurriculumVersionStatus.DRAFT);
        const code = `RLS-CV-${crypto.randomUUID()}`;
        try {
          await expect(
            runRlsProbe(RLS_AUTH_UUIDS.FACULTY, async (tx) => {
              await tx.$executeRawUnsafe(
                `INSERT INTO "curriculum_versions" ("program_id", "code", "name", "status", "updated_at") VALUES ($1::uuid, $2, $3, 'DRAFT', now())`,
                bsit.id,
                code,
                "unauthorized probe"
              );
            })
          ).rejects.toMatchObject({ meta: { code: "42501" } });

          const updated = await runRlsProbe(RLS_AUTH_UUIDS.FACULTY, async (tx) =>
            tx.$executeRawUnsafe(
              `UPDATE "curriculum_versions" SET "name" = $2 WHERE "id" = $1::uuid`,
              version.id,
              "should be invisible"
            )
          );
          expect(updated).toBe(0);

          const deleted = await runRlsProbe(RLS_AUTH_UUIDS.FACULTY, async (tx) =>
            tx.$executeRawUnsafe(
              `DELETE FROM "curriculum_versions" WHERE "id" = $1::uuid`,
              version.id
            )
          );
          expect(deleted).toBe(0);
        } finally {
          await cleanupVersions([version.id]);
        }
      });
    });

    describe("curriculum_courses parent-version scoping", () => {
      it("allows Secretary and in-scope Program Head to insert into a DRAFT parent", async () => {
        const bsit = await findProgram("BSIT");
        const version = await fixtureVersion(bsit.id, CurriculumVersionStatus.DRAFT);
        const course = await prisma.course.findFirstOrThrow({ where: { code: "IT201" } });
        try {
          for (const authUid of [RLS_AUTH_UUIDS.SECRETARY, RLS_AUTH_UUIDS.PROGRAM_HEAD_BSIT]) {
            await runRlsProbe(authUid, async (tx) => {
              await tx.$executeRawUnsafe(
                `INSERT INTO "curriculum_courses" ("curriculum_version_id", "course_id", "year_level", "semester", "term", "course_code_snapshot", "course_title_snapshot", "updated_at") VALUES ($1::uuid, $2::uuid, $3::year_level, $4::academic_semester, 'FIRST_TERM', $5, $6, now())`,
                version.id,
                course.id,
                "FIRST_YEAR",
                "1ST",
                course.code,
                course.title
              );
            });
          }
        } finally {
          await cleanupVersions([version.id]);
        }
      });

      it("denies cross-Program insert and PUBLISHED-parent insert", async () => {
        const bsit = await findProgram("BSIT");
        const bsed = await findProgram("BSED");
        const draftBsed = await fixtureVersion(bsed.id, CurriculumVersionStatus.DRAFT);
        const publishedBsit = await fixtureVersion(bsit.id, CurriculumVersionStatus.PUBLISHED);
        const course = await prisma.course.findFirstOrThrow({ where: { code: "IT201" } });
        try {
          // In-scope Program Head cannot add a course under another program's version.
          await expect(
            runRlsProbe(RLS_AUTH_UUIDS.PROGRAM_HEAD_BSIT, async (tx) => {
              await tx.$executeRawUnsafe(
                `INSERT INTO "curriculum_courses" ("curriculum_version_id", "course_id", "year_level", "semester", "term", "course_code_snapshot", "course_title_snapshot", "updated_at") VALUES ($1::uuid, $2::uuid, $3::year_level, $4::academic_semester, 'FIRST_TERM', $5, $6, now())`,
                draftBsed.id,
                course.id,
                "FIRST_YEAR",
                "1ST",
                course.code,
                course.title
              );
            })
          ).rejects.toMatchObject({ meta: { code: "42501" } });

          // No role can add a course under a PUBLISHED version.
          await expect(
            runRlsProbe(RLS_AUTH_UUIDS.SECRETARY, async (tx) => {
              await tx.$executeRawUnsafe(
                `INSERT INTO "curriculum_courses" ("curriculum_version_id", "course_id", "year_level", "semester", "term", "course_code_snapshot", "course_title_snapshot", "updated_at") VALUES ($1::uuid, $2::uuid, $3::year_level, $4::academic_semester, 'FIRST_TERM', $5, $6, now())`,
                publishedBsit.id,
                course.id,
                "FIRST_YEAR",
                "1ST",
                course.code,
                course.title
              );
            })
          ).rejects.toMatchObject({ meta: { code: "42501" } });
        } finally {
          await cleanupVersions([draftBsed.id, publishedBsit.id]);
        }
      });
    });

    describe("authenticated read access", () => {
      it("lets every authenticated identity read curriculum rows", async () => {
        const bsit = await findProgram("BSIT");
        const version = await fixtureVersion(bsit.id, CurriculumVersionStatus.DRAFT);
        try {
          const visible = await runRlsProbe(RLS_AUTH_UUIDS.FACULTY, async (tx) =>
            tx.$queryRawUnsafe<Array<{ id: string }>>(
              `SELECT "id" FROM "curriculum_versions" WHERE "id" = $1::uuid`,
              version.id
            )
          );
          expect(visible).toHaveLength(1);
          expect(visible[0].id).toBe(version.id);
        } finally {
          await cleanupVersions([version.id]);
        }
      });
    });
  }
);
