import { AcademicSemester, AcademicTerm } from "@prisma/client";

import { getSemesterLabel, getTermLabel } from "@/lib/constants/academic";

type PeriodInput = {
  school_year: { code: string };
  semester: string;
  term: string | null;
};

/** "2025-2026 — 2nd Semester — 2nd Term" style period label used across PH review. */
export function buildPeriodLabel(period: PeriodInput): string {
  const semesterLabel = getSemesterLabel(period.semester as AcademicSemester);
  const termLabel = period.term ? getTermLabel(period.term as AcademicTerm) : "";
  return termLabel
    ? `${period.school_year.code} — ${semesterLabel} — ${termLabel}`
    : `${period.school_year.code} — ${semesterLabel}`;
}
