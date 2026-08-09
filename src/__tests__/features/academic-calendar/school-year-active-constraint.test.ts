import crypto from "node:crypto";
import { AcademicSemester } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { activateSchoolYear } from "@/features/academic-calendar/services/manage-school-years";
import { ROLES } from "@/lib/constants/roles";

// Real user row so the active_semester_activated_by FK (users.id) is satisfied.
const SECRETARY_USER_ID = "32000000-0000-4000-8000-000000000001";

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(async () => ({
    userId: SECRETARY_USER_ID,
    roles: [ROLES.SECRETARY],
    activeRole: ROLES.SECRETARY,
  })),
}));
vi.mock("@/lib/cache/academic-periods", () => ({
  invalidateAcademicPeriodReadModelTags: vi.fn(),
}));

describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "SchoolYear one-active constraint",
  () => {
    it("allows only one of two concurrent activations to succeed (P2002/P2034)", async () => {
      const suffix = crypto.randomUUID();

      await prisma.user
        .create({
          data: {
            id: SECRETARY_USER_ID,
            email: `sy-constraint-secretary-${suffix}@test.invalid`,
            first_name: "Constraint",
            last_name: "Secretary",
          },
        })
        .catch(() => undefined);

      const priorActive = await prisma.schoolYear.findFirst({
        where: { is_active: true },
        select: {
          id: true,
          active_semester: true,
          active_semester_activated_by: true,
          active_semester_activated_at: true,
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
        const results = await Promise.allSettled([
          activateSchoolYear(first.id, AcademicSemester.FIRST),
          activateSchoolYear(second.id, AcademicSemester.FIRST),
        ]);

        const outcomes: Array<
          { success: true; data: { id: string } } | { success: false; error: string }
        > = results.map((r) =>
          r.status === "fulfilled" ? r.value : { success: false as const, error: String(r.reason) }
        );
        const succeeded = outcomes.filter(
          (o): o is { success: true; data: { id: string } } => o.success === true
        );
        const failed = outcomes.filter(
          (o): o is { success: false; error: string } => o.success === false
        );

        expect(succeeded).toHaveLength(1);
        expect(failed).toHaveLength(1);
        expect(failed[0].error).toContain("Another school year is already active");

        const activeRows = await prisma.schoolYear.findMany({
          where: { id: { in: [first.id, second.id] }, is_active: true },
        });
        expect(activeRows).toHaveLength(1);
        expect(activeRows[0].id).toBe(succeeded[0].data.id);
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
        await prisma.user
          .delete({ where: { id: SECRETARY_USER_ID } })
          .catch(() => undefined);
        // The concurrent activations deactivate any pre-existing active School
        // Year; restore its exact prior state so the fixture database is left
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
