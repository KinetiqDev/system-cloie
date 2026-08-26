// fallow-ignore-file code-duplication
import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";

function getPrismaCode(error: unknown): string | undefined {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as Record<string, unknown>).code === "string"
  ) {
    // Unchecked cast is safe here: we just verified code is string via typeof guard above, and Prisma error shape is not validated by schema.
    const code = (error as { code: string }).code;
    return code;
  }
  return undefined;
}

/**
 * Academic Period one-active invariant (issue #549, ADR 0012).
 *
 * Exactly one AcademicTermInstance may carry status = ACTIVE at any time
 * (partial unique index `one_active_academic_period`). This suite pins that
 * database constraint, mirroring the existing SchoolYear active-constraint
 * suite but for the period status index.
 *
 * The service-level deactivate-then-activate and its error mapping are
 * covered by `manage-academic-period-lifecycle.test.ts`; this suite proves
 * the index itself.
 */
describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "Academic Period one-active invariant",
  () => {
    it("allows only one of two concurrent ACTIVE promotions to succeed (P2002)", async () => {
      const suffix = crypto.randomUUID();

      const priorActive = await prisma.academicTermInstance.findFirst({
        where: { status: "ACTIVE" },
        select: { id: true, status: true, school_year_id: true },
      });

      let firstId: string | null = null;
      let secondId: string | null = null;
      let tempSyId: string | null = null;
      let bodyFailed = false;

      try {
        // Keep the one-active slot occupied would make both promotions fail
        // up front, so clear it and restore in finally.
        await prisma.academicTermInstance.updateMany({
          where: { status: "ACTIVE" },
          data: { status: "COMPLETED" },
        });

        // Create a disposable School Year to host two temp PLANNED periods.
        // The School Year code must be unique per run; use the suffix.
        const tempSy = await prisma.schoolYear.create({
          data: { code: `PERIOD-INV-${suffix}` },
        });
        tempSyId = tempSy.id;

        const first = await prisma.academicTermInstance.create({
          data: {
            school_year_id: tempSy.id,
            semester: "FIRST",
            status: "PLANNED",
          },
        });
        const second = await prisma.academicTermInstance.create({
          data: {
            school_year_id: tempSy.id,
            semester: "SECOND",
            status: "PLANNED",
          },
        });
        firstId = first.id;
        secondId = second.id;

        const results = await Promise.allSettled([
          prisma.academicTermInstance.update({
            where: { id: first.id },
            data: { status: "ACTIVE" },
          }),
          prisma.academicTermInstance.update({
            where: { id: second.id },
            data: { status: "ACTIVE" },
          }),
        ]);

        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect(getPrismaCode(rejected[0].reason)).toBe("P2002");

        const activeRows = await prisma.academicTermInstance.findMany({
          where: { id: { in: [first.id, second.id] }, status: "ACTIVE" },
        });
        expect(activeRows).toHaveLength(1);
      } catch (error) {
        bodyFailed = true;
        throw error;
      } finally {
        // Tear down in dependency order: snapshots block period deletion, so
        // drop the snapshot before removing terms.
        const createdIds = [firstId, secondId].filter((id): id is string => id !== null);
        if (createdIds.length > 0) {
          await prisma.$executeRawUnsafe(
            'ALTER TABLE "academic_period_readiness_snapshots" DISABLE TRIGGER "academic_period_readiness_snapshots_immutable"'
          );
          try {
            await prisma.academicPeriodReadinessSnapshot
              .deleteMany({ where: { period_id: { in: createdIds } } })
              .catch(() => undefined);
          } finally {
            await prisma.$executeRawUnsafe(
              'ALTER TABLE "academic_period_readiness_snapshots" ENABLE TRIGGER "academic_period_readiness_snapshots_immutable"'
            );
          }
          // Ensure no leftover ACTIVE row blocks the restoration.
          await prisma.academicTermInstance
            .updateMany({
              where: { id: { in: createdIds }, status: "ACTIVE" },
              data: { status: "PLANNED" },
            })
            .catch(() => undefined);
          await prisma.academicTermInstance
            .deleteMany({ where: { id: { in: createdIds } } })
            .catch(() => undefined);
        }
        if (tempSyId) {
          await prisma.schoolYear.delete({ where: { id: tempSyId } }).catch(() => undefined);
        }
        // Restore the exact prior ACTIVE period so the fixture database is
        // left untouched for later suites.
        if (priorActive) {
          // Clear any concurrent ACTIVE that might have been created by the
          // successful promotion before restoring the prior row.
          await prisma.academicTermInstance
            .updateMany({
              where: { status: "ACTIVE", id: { not: priorActive.id } },
              data: { status: "COMPLETED" },
            })
            .catch(() => undefined);
          await prisma.academicTermInstance
            .update({ where: { id: priorActive.id }, data: { status: "ACTIVE" } })
            .catch((error: unknown) => {
              if (!bodyFailed) throw error;
            });
        }
      }
    }, 30000);

    it("seed fixture keeps at most one ACTIVE period before any mutation", async () => {
      const activeRows = await prisma.academicTermInstance.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      expect(activeRows.length).toBeLessThanOrEqual(1);
    });
  }
);
