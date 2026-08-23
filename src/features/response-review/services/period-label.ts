type PeriodInput = {
  school_year: { code: string };
  semester: string;
  term: string | null;
};

/** "2025-2026 — SECOND — FIRST_TERM" style period label used across PH review. */
export function buildPeriodLabel(period: PeriodInput): string {
  const termLabel = period.term ? `${period.term}` : "";
  return termLabel
    ? `${period.school_year.code} — ${period.semester} — ${termLabel}`
    : `${period.school_year.code} — ${period.semester}`;
}
