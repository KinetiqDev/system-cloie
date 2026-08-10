import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";

describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "SchoolYear one-active constraint",
  () => {
    it("allows only one of two concurrent activations to succeed (P2002)", async () => {
      const suffix = crypto.randomUUID();

      const priorActive = await prisma.schoolYear.findFirst({
        where: { is_active: true },
        select: {
          id: true,
          active_semester: true,
          active_semester_activated_by: true,
          active_semester_activated_at: true,
        },
      });

      // The seeded fixture keeps the demo School Year active, so the
      // one-active partial unique index is already occupied. Deactivate it
      // (restored in the finally block) so the race below arbitrates on the
      // index instead of failing both attempts up front.
      await prisma.schoolYear.updateMany({
        where: { is_active: true },
        data: {
          is_active: false,
          active_semester: null,
          active_semester_activated_by: null,
          active_semester_activated_at: null,
        },
      });

      const first = await prisma.schoolYear.create({
        data: {
          code: `CONC-A-${suffix}`,
          is_active: false,
          active_semester: null,
        },
      });
      const second = await prisma.schoolYear.create({
        data: {
          code: `CONC-B-${suffix}`,
          is_active: false,
          active_semester: null,
        },
      });

      let bodyFailed = false;
      try {
        // Two raw activations against the one-active partial unique index:
        // exactly one row can carry is_active = true, so one of the two
        // concurrent updates must fail with a unique-constraint violation
        // regardless of how the transactions interleave. (The service-level
        // deactivate-then-activate behavior and its P2002/P2034 error mapping
        // are covered by the unit suite; this suite pins the DB constraint.)
        const results = await Promise.allSettled([
          prisma.schoolYear.update({
            where: { id: first.id },
            data: { is_active: true },
          }),
          prisma.schoolYear.update({
            where: { id: second.id },
            data: { is_active: true },
          }),
        ]);

        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter(
          (r): r is PromiseRejectedResult => r.status === "rejected"
        );

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect((rejected[0].reason as { code?: string }).code).toBe("P2002");

        const activeRows = await prisma.schoolYear.findMany({
          where: { id: { in: [first.id, second.id] }, is_active: true },
        });
        expect(activeRows).toHaveLength(1);
      } catch (error) {
        bodyFailed = true;
        throw error;
      } finally {
        await prisma.schoolYear
          .updateMany({
            where: { id: { in: [first.id, second.id] }, is_active: true },
            data: { is_active: false, active_semester: null },
          })
          .catch(() => undefined);
        await prisma.schoolYear.deleteMany({
          where: { id: { in: [first.id, second.id] } },
        });
        // Restore the exact prior active state so the fixture database is left
        // untouched for later suites. Restoration failures surface loudly
        // unless the test body already failed (which keeps the body error).
        if (priorActive) {
          await prisma.schoolYear
            .update({
              where: { id: priorActive.id },
              data: {
                is_active: true,
                active_semester: priorActive.active_semester,
                active_semester_activated_by: priorActive.active_semester_activated_by,
                active_semester_activated_at: priorActive.active_semester_activated_at,
              },
            })
            .catch((error: unknown) => {
              if (!bodyFailed) throw error;
            });
        }
      }
    }, 30000);
  }
);
