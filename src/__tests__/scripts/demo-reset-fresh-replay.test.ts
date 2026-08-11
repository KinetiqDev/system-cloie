import { afterAll, describe, expect, it } from "vitest";

import { resetDemoDatabase } from "../../../scripts/reset-demo-database";
import { prisma } from "@/lib/db/prisma";

describe.skipIf(process.env.RUN_DEMO_RESET_INTEGRATION_TESTS !== "1")(
  "dedicated demo reset fresh replay",
  () => {
    it("replays migrations, seeds fixtures, and restores SQL-only schema protections", async () => {
      resetDemoDatabase({ ...process.env, NODE_ENV: "production" });

      const [seededCourse, enrollmentCount, assignmentCount, triggers] = await Promise.all([
        prisma.course.findFirst({
          where: { seed_source: "ACD_DEMO_CATALOG" },
          select: { code: true, seed_source: true },
        }),
        prisma.studentEnrollment.count(),
        prisma.courseAssignment.count(),
        prisma.$queryRawUnsafe<Array<{ trigger_name: string }>>(
          `
              SELECT trigger_name
              FROM information_schema.triggers
              WHERE event_object_schema = 'public'
                AND (
                  (event_object_table = 'courses' AND trigger_name = 'course_seed_source_immutable')
                  OR (
                    event_object_table = 'academic_period_readiness_snapshots'
                    AND trigger_name = 'academic_period_readiness_snapshots_immutable'
                  )
                )
            `
        ),
      ]);

      expect(seededCourse).toEqual({ code: expect.any(String), seed_source: "ACD_DEMO_CATALOG" });
      expect(enrollmentCount).toBeGreaterThan(0);
      expect(assignmentCount).toBeGreaterThan(0);
      expect(triggers.map(({ trigger_name }) => trigger_name)).toEqual(
        expect.arrayContaining([
          "course_seed_source_immutable",
          "academic_period_readiness_snapshots_immutable",
        ])
      );
    }, 600_000);

    afterAll(async () => {
      await prisma.$disconnect();
    });
  }
);
