import { AcademicSemester, AcademicTerm } from "@prisma/client";
import {
  getSemesterTermLabel,
  getSemesterShortLabel,
  getTermShortLabel,
} from "@/lib/constants/academic-period";

/**
 * Format a single date as a readable string.
 * Example: "Mar 18, 2025"
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Format a date range as a readable string.
 * Example: "Jan 1, 2025 – Dec 31, 2025"
 */
export function formatDateRange(startDate: Date | null, endDate: Date | null): string {
  if (!startDate && !endDate) return "No dates set";
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  
  const start = startDate ? formatter.format(startDate) : "?";
  const end = endDate ? formatter.format(endDate) : "?";
  
  return `${start} – ${end}`;
}

/**
 * Format a school year range.
 * Example: "2025-2026"
 */
export function formatSchoolYearRange(startYear: number, endYear: number): string {
  return `${startYear}-${endYear}`;
}

/**
 * Format a term instance label with full details.
 * Example: "2025-2026 — 1st Semester — 1st Term"
 */
export function formatTermInstanceLabel(
  schoolYearCode: string,
  semester: AcademicSemester,
  term: AcademicTerm | null
): string {
  const semesterTermLabel = getSemesterTermLabel(semester, term);
  return `${schoolYearCode} — ${semesterTermLabel}`;
}

/**
 * Format a term instance as a compact label.
 * Example: "2025-2026 | 1st Sem — 1st Term"
 */
export function formatTermInstanceCompact(
  schoolYearCode: string,
  semester: AcademicSemester,
  term: AcademicTerm | null
): string {
  const semLabel = getSemesterShortLabel(semester);
  const termLabel = getTermShortLabel(term);
  const parts = [schoolYearCode, termLabel ? `${semLabel} — ${termLabel}` : semLabel];
  return parts.join(" | ");
}

/**
 * Format a term instance as a badge-like short label.
 * Example: "2025-26 1st Sem"
 */
export function formatTermInstanceShort(
  schoolYearCode: string,
  semester: AcademicSemester
): string {
  const shortYear = schoolYearCode.slice(2, 4) + "-" + schoolYearCode.slice(7, 9);
  return `${shortYear} ${getSemesterShortLabel(semester)}`;
}
