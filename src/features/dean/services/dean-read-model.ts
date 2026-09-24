import type { AcademicPeriodStatus, Prisma } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listAcademicPeriodSummaries } from "@/features/academic-calendar/services/read-academic-period-summaries";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { prisma } from "@/lib/db/prisma";

export class DeanReadModelNotFoundError extends Error {}
export class DeanReadModelBadRequestError extends Error {}
export class DeanReadModelUnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeanReadModelUnauthorizedError";
  }
}

export type DeanReadState<T> = { state: "ready"; data: T } | { state: "no-eligible-period" };

export type DeanPeriodSummary = {
  id: string;
  label: string;
  status: AcademicPeriodStatus;
};

type PeriodRecord = Prisma.AcademicTermInstanceGetPayload<{
  include: { school_year: { select: { code: true } } };
}>;

export function periodSummary(period: PeriodRecord): DeanPeriodSummary {
  return {
    id: period.id,
    label: formatTermInstanceLabel(period.school_year.code, period.semester, period.term),
    status: period.status,
  };
}

export async function listDeanEligiblePeriods(): Promise<DeanPeriodSummary[]> {
  const session = await resolveAuthSession();
  if (!session) throw new DeanReadModelUnauthorizedError("Authentication required.");
  if (session.activeRole !== ROLES.DEAN) {
    throw new DeanReadModelUnauthorizedError("College Dean access required.");
  }

  return listAcademicPeriodSummaries();
}

async function findEligiblePeriod(
  periodId: string | undefined,
  defaultMode: "active" | "active-or-completed"
): Promise<PeriodRecord | null> {
  if (periodId) {
    const period = await prisma.academicTermInstance.findUnique({
      where: { id: periodId },
      include: { school_year: { select: { code: true } } },
    });
    if (!period || (period.status !== "ACTIVE" && period.status !== "COMPLETED")) {
      throw new DeanReadModelNotFoundError("Academic period is not eligible");
    }
    return period;
  }

  const active = await prisma.academicTermInstance.findFirst({
    where: { status: "ACTIVE" },
    include: { school_year: { select: { code: true } } },
  });
  if (active || defaultMode === "active") return active;
  return prisma.academicTermInstance.findFirst({
    where: { status: "COMPLETED" },
    include: { school_year: { select: { code: true } } },
    orderBy: [{ end_date: "desc" }, { created_at: "desc" }],
  });
}

export async function requirePeriod(
  periodId: string | undefined,
  defaultMode: "active" | "active-or-completed"
): Promise<PeriodRecord | null> {
  const period = await findEligiblePeriod(periodId, defaultMode);
  if (!period && periodId) throw new DeanReadModelNotFoundError("Academic period is not eligible");
  return period;
}
