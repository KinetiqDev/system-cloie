import { prisma } from "@/lib/db/prisma";
import { readPeriodReadinessTotals } from "@/features/academic-calendar/services/read-period-readiness";
import { periodSummary, type DeanReadState } from "./dean-read-model";

export type DeanDashboardData = {
  activePeriod: { id: string; label: string };
  kpis: {
    activeContexts: number;
    readyContexts: number;
    missingCiloContexts: number;
    incompleteMappingContexts: number;
  };
  risks: { missingCilos: number; incompleteMappings: number; notReady: number };
  programs: Array<{
    id: string;
    name: string;
    activeContexts: number;
    readyContexts: number;
    missingCiloContexts: number;
    incompleteMappingContexts: number;
  }>;
};

export async function getDeanDashboard(): Promise<DeanReadState<DeanDashboardData>> {
  const period = await prisma.academicTermInstance.findFirst({
    where: { status: "ACTIVE" },
    include: { school_year: { select: { code: true } } },
  });
  if (!period) return { state: "no-eligible-period" };

  const programTotals = await readPeriodReadinessTotals(period.id);
  const missingCilos = programTotals.reduce((sum, total) => sum + total.missingCiloContexts, 0);
  const incompleteMappings = programTotals.reduce(
    (sum, total) => sum + total.incompleteMappingContexts,
    0
  );
  return {
    state: "ready",
    data: {
      activePeriod: { id: period.id, label: periodSummary(period).label },
      kpis: {
        activeContexts: programTotals.reduce((sum, total) => sum + total.activeContexts, 0),
        readyContexts: programTotals.reduce((sum, total) => sum + total.readyContexts, 0),
        missingCiloContexts: missingCilos,
        incompleteMappingContexts: incompleteMappings,
      },
      risks: { missingCilos, incompleteMappings, notReady: missingCilos + incompleteMappings },
      programs: programTotals.map(
        ({
          programId,
          programName,
          activeContexts,
          readyContexts,
          missingCiloContexts,
          incompleteMappingContexts,
        }) => ({
          id: programId,
          name: programName,
          activeContexts,
          readyContexts,
          missingCiloContexts,
          incompleteMappingContexts,
        })
      ),
    },
  };
}
