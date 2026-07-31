"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import {
  ACADEMIC_PERIODS_TAG,
  ACTIVE_ACADEMIC_PERIOD_TAG,
  ACADEMIC_PERIOD_SUMMARIES_REVALIDATE_SECONDS,
} from "@/lib/cache/academic-periods";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import type { AcademicPeriodSummary } from "../types";

const ACADEMIC_PERIOD_SUMMARIES_CACHE_KEY = "academic-period-summaries-v1";

/**
 * This function accepts no request or identity data. Its caller must perform
 * role authorization before invoking the cached projection.
 */
const readCachedAcademicPeriodSummaries = unstable_cache(
  async (): Promise<AcademicPeriodSummary[]> => {
    const [active, completed] = await Promise.all([
      prisma.academicTermInstance.findFirst({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          semester: true,
          term: true,
          status: true,
          school_year: { select: { code: true } },
        },
      }),
      prisma.academicTermInstance.findMany({
        where: { status: "COMPLETED" },
        select: {
          id: true,
          semester: true,
          term: true,
          status: true,
          school_year: { select: { code: true } },
        },
        orderBy: [{ end_date: "desc" }, { created_at: "desc" }],
      }),
    ]);

    return [active, ...completed]
      .filter((period): period is NonNullable<typeof period> => Boolean(period))
      .map((period) => ({
        id: period.id,
        label: formatTermInstanceLabel(period.school_year.code, period.semester, period.term),
        status: period.status,
      }));
  },
  [ACADEMIC_PERIOD_SUMMARIES_CACHE_KEY],
  {
    tags: [ACADEMIC_PERIODS_TAG, ACTIVE_ACADEMIC_PERIOD_TAG],
    revalidate: ACADEMIC_PERIOD_SUMMARIES_REVALIDATE_SECONDS,
  }
);

export async function listAcademicPeriodSummaries(): Promise<AcademicPeriodSummary[]> {
  return readCachedAcademicPeriodSummaries();
}
