import { AcademicSemester, AcademicTerm } from "@prisma/client";

/**
 * The 5 fixed period definitions every School Year SHALL contain.
 * Summer has no term (term is null); First and Second semesters have both terms.
 */
export const CANONICAL_TERMS: Array<{
  semester: AcademicSemester;
  term: AcademicTerm | null;
  label: string;
}> = [
  { semester: AcademicSemester.FIRST, term: AcademicTerm.FIRST_TERM, label: "1st Semester — 1st Term" },
  { semester: AcademicSemester.FIRST, term: AcademicTerm.SECOND_TERM, label: "1st Semester — 2nd Term" },
  { semester: AcademicSemester.SECOND, term: AcademicTerm.FIRST_TERM, label: "2nd Semester — 1st Term" },
  { semester: AcademicSemester.SECOND, term: AcademicTerm.SECOND_TERM, label: "2nd Semester — 2nd Term" },
  { semester: AcademicSemester.SUMMER, term: null, label: "Summer" },
];

/**
 * Valid semester-term combinations (same set as the canonical terms).
 */
export const ALLOWED_SEMESTER_TERM_PAIRS = CANONICAL_TERMS;

/**
 * Format a school year code from a start year.
 * Example: 2025 -> "2025-2026"
 */
export function formatSchoolYearCode(startYear: number): string {
  return `${startYear}-${startYear + 1}`;
}

/**
 * Parse a school year code into start and end years.
 * Returns null if invalid format.
 * Example: "2025-2026" -> { startYear: 2025, endYear: 2026 }
 */
export function parseSchoolYearCode(code: string): { startYear: number; endYear: number } | null {
  const match = code.match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;
  
  const startYear = parseInt(match[1], 10);
  const endYear = parseInt(match[2], 10);
  
  if (endYear !== startYear + 1) return null;
  
  return { startYear, endYear };
}

/**
 * Assert that a semester-term combination is valid.
 * Summer must have null term.
 * First/Second semesters must have a term.
 */
export function assertValidSemesterTerm(
  semester: AcademicSemester,
  term: AcademicTerm | null | undefined
): { valid: true } | { valid: false; error: string } {
  if (semester === AcademicSemester.SUMMER) {
    if (term !== null && term !== undefined) {
      return { valid: false, error: "Summer semester cannot have a term" };
    }
    return { valid: true };
  }
  
  if (term === null || term === undefined) {
    return { valid: false, error: "First and Second semesters must have a term" };
  }
  
  return { valid: true };
}

/**
 * Check if a semester-term pair is valid.
 */
export function isValidSemesterTerm(
  semester: AcademicSemester,
  term: AcademicTerm | null | undefined
): boolean {
  return assertValidSemesterTerm(semester, term).valid;
}

/**
 * Get the display label for a semester-term pair.
 */
export function getSemesterTermLabel(
  semester: AcademicSemester,
  term: AcademicTerm | null | undefined
): string {
  const pair = ALLOWED_SEMESTER_TERM_PAIRS.find(
    (p) => p.semester === semester && p.term === (term ?? null)
  );
  return pair?.label ?? "Unknown";
}

/**
 * Get the short label for a semester.
 */
export function getSemesterShortLabel(semester: AcademicSemester): string {
  switch (semester) {
    case AcademicSemester.FIRST:
      return "1st Sem";
    case AcademicSemester.SECOND:
      return "2nd Sem";
    case AcademicSemester.SUMMER:
      return "Summer";
    default:
      return "Unknown";
  }
}

/**
 * Get the short label for a term.
 */
export function getTermShortLabel(term: AcademicTerm | null | undefined): string {
  if (!term) return "";
  switch (term) {
    case AcademicTerm.FIRST_TERM:
      return "1st Term";
    case AcademicTerm.SECOND_TERM:
      return "2nd Term";
    default:
      return "";
  }
}

/**
 * Canonical semester ordering for chronological comparisons.
 * FIRST (0) -> SECOND (1) -> SUMMER (2)
 */
export const SEMESTER_ORDER: Record<AcademicSemester, number> = {
  [AcademicSemester.FIRST]: 0,
  [AcademicSemester.SECOND]: 1,
  [AcademicSemester.SUMMER]: 2,
};

/**
 * Compare two semesters for chronological ordering.
 * Returns negative if a comes before b, positive if a comes after b, 0 if equal.
 */
export function compareSemesters(
  a: AcademicSemester,
  b: AcademicSemester
): number {
  return SEMESTER_ORDER[a] - SEMESTER_ORDER[b];
}
