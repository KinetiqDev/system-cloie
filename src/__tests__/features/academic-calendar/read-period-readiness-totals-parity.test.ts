import crypto from "crypto";
import { AcademicPeriodStatus, AcademicSemester, AcademicTerm } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  readPeriodReadiness,
  readPeriodReadinessTotals,
} from "@/features/academic-calendar/services/read-period-readiness";

describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "period readiness totals parity",
  () => {
    it("matches canonical active and completed readiness totals", async () => {
      const activePeriod = await prisma.academicTermInstance.findFirst({
        where: { status: "ACTIVE" },
      });

      expect(activePeriod).toBeTruthy();
      if (!activePeriod) return;

      const schoolYear = await prisma.schoolYear.create({
        data: {
          code: `PARITY-${crypto.randomUUID()}`,
          start_date: new Date("2030-06-01"),
          end_date: new Date("2031-05-31"),
        },
      });
      const completedPeriod = await prisma.academicTermInstance.create({
        data: {
          school_year_id: schoolYear.id,
          semester: AcademicSemester.FIRST,
          term: AcademicTerm.FIRST_TERM,
          status: AcademicPeriodStatus.COMPLETED,
          start_date: new Date("2030-08-01"),
          end_date: new Date("2030-12-15"),
        },
      });
      const snapshotTotals = [
        {
          programId: "historical-program",
          programName: "Historical Program",
          activeContexts: 1,
          readyContexts: 1,
          missingCiloContexts: 0,
          incompleteMappingContexts: 0,
        },
      ];
      await prisma.academicPeriodReadinessSnapshot.create({
        data: { period_id: completedPeriod.id, contexts: [], program_totals: snapshotTotals },
      });

      try {
        const [activeTotals, activeReadiness, completedTotals, completedReadiness] =
          await Promise.all([
            readPeriodReadinessTotals(activePeriod.id),
            readPeriodReadiness(activePeriod.id),
            readPeriodReadinessTotals(completedPeriod.id),
            readPeriodReadiness(completedPeriod.id),
          ]);

        expect(activeTotals).toEqual(activeReadiness.programTotals);
        expect(completedTotals).toEqual(completedReadiness.programTotals);
      } finally {
        await prisma.$executeRawUnsafe(
          'ALTER TABLE "academic_period_readiness_snapshots" DISABLE TRIGGER "academic_period_readiness_snapshots_immutable"'
        );
        try {
          await prisma.academicPeriodReadinessSnapshot.delete({
            where: { period_id: completedPeriod.id },
          });
        } finally {
          await prisma.$executeRawUnsafe(
            'ALTER TABLE "academic_period_readiness_snapshots" ENABLE TRIGGER "academic_period_readiness_snapshots_immutable"'
          );
        }
        await prisma.academicTermInstance.delete({ where: { id: completedPeriod.id } });
        await prisma.schoolYear.delete({ where: { id: schoolYear.id } });
      }
    });
  }
);
