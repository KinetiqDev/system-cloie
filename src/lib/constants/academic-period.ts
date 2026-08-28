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
  {
    semester: AcademicSemester.FIRST,
    term: AcademicTerm.FIRST_TERM,
    label: "1st Semester — 1st Term",
  },
  {
    semester: AcademicSemester.FIRST,
    term: AcademicTerm.SECOND_TERM,
    label: "1st Semester — 2nd Term",
  },
  {
    semester: AcademicSemester.SECOND,
    term: AcademicTerm.FIRST_TERM,
    label: "2nd Semester — 1st Term",
  },
  {
    semester: AcademicSemester.SECOND,
    term: AcademicTerm.SECOND_TERM,
    label: "2nd Semester — 2nd Term",
  },
  { semester: AcademicSemester.SUMMER, term: null, label: "Summer" },
];

/**
 * Valid semester-term combinations (same set as the canonical terms).
 */
export const ALLOWED_SEMESTER_TERM_PAIRS = CANONICAL_TERMS;

/**
 * Normalize a user-typed CSV cell for friendly-value lookup: NFKC, trimmed,
 * lowercased, non-alphanumerics stripped. "1st Semester" → "1stsemester",
 * "FIRST_TERM" → "firstterm".
 */
export function normalizeFriendlyInput(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Accepted friendly spellings for each AcademicSemester, keyed by
 * normalizeFriendlyInput output. Covers numbers ("1", "2", "3"), ordinals
 * ("1st", "1st Semester"), words ("first", "summer"), and the enum spellings
 * ("FIRST"). Blank input parses to null (leave unset).
 */
const SEMESTER_ALIASES: Record<string, AcademicSemester> = {
  "1": AcademicSemester.FIRST,
  "1st": AcademicSemester.FIRST,
  "1stsem": AcademicSemester.FIRST,
  "1stsemester": AcademicSemester.FIRST,
  first: AcademicSemester.FIRST,
  firstsem: AcademicSemester.FIRST,
  firstsemester: AcademicSemester.FIRST,
  sem1: AcademicSemester.FIRST,
  semester1: AcademicSemester.FIRST,
  "2": AcademicSemester.SECOND,
  "2nd": AcademicSemester.SECOND,
  "2ndsem": AcademicSemester.SECOND,
  "2ndsemester": AcademicSemester.SECOND,
  second: AcademicSemester.SECOND,
  secondsem: AcademicSemester.SECOND,
  secondsemester: AcademicSemester.SECOND,
  sem2: AcademicSemester.SECOND,
  semester2: AcademicSemester.SECOND,
  "3": AcademicSemester.SUMMER,
  "3rd": AcademicSemester.SUMMER,
  "3rdsem": AcademicSemester.SUMMER,
  "3rdsemester": AcademicSemester.SUMMER,
  summer: AcademicSemester.SUMMER,
  summersem: AcademicSemester.SUMMER,
  summersemester: AcademicSemester.SUMMER,
  sem3: AcademicSemester.SUMMER,
  semester3: AcademicSemester.SUMMER,
};

/**
 * Parse a CSV semester cell into an AcademicSemester. Accepts friendly values
 * such as "1" or "Summer" alongside the exact enum spelling "FIRST".
 * Blank parses to null (defaults are optional). Returns a fix-step error for
 * unrecognized values so callers never surface raw enum names.
 */
export function parseSemesterInput(
  value: string | null | undefined
): { ok: true; value: AcademicSemester | null } | { ok: false; error: string } {
  const key = normalizeFriendlyInput(value);
  if (key === "") return { ok: true, value: null };
  const parsed = SEMESTER_ALIASES[key];
  if (parsed) return { ok: true, value: parsed };
  return {
    ok: false,
    error: `Semester "${value}" is not recognized. Use 1, 2, or 3 (for example "1st Semester" or "Summer").`,
  };
}

/**
 * Accepted friendly spellings for each AcademicTerm, keyed by
 * normalizeFriendlyInput output. Covers numbers ("1", "2"), ordinals
 * ("1st", "1st Term"), words ("first term"), and the enum spellings
 * ("FIRST_TERM"). Blank input parses to null (leave unset).
 */
const TERM_ALIASES: Record<string, AcademicTerm> = {
  "1": AcademicTerm.FIRST_TERM,
  "1st": AcademicTerm.FIRST_TERM,
  "1stterm": AcademicTerm.FIRST_TERM,
  first: AcademicTerm.FIRST_TERM,
  firstterm: AcademicTerm.FIRST_TERM,
  term1: AcademicTerm.FIRST_TERM,
  "2": AcademicTerm.SECOND_TERM,
  "2nd": AcademicTerm.SECOND_TERM,
  "2ndterm": AcademicTerm.SECOND_TERM,
  second: AcademicTerm.SECOND_TERM,
  secondterm: AcademicTerm.SECOND_TERM,
  term2: AcademicTerm.SECOND_TERM,
};

/**
 * Parse a CSV term cell into an AcademicTerm. Accepts friendly values such as
 * "1" or "1st Term" alongside the exact enum spelling "FIRST_TERM".
 * Blank parses to null (defaults are optional). Returns a fix-step error for
 * unrecognized values so callers never surface raw enum names.
 */
export function parseTermInput(
  value: string | null | undefined
): { ok: true; value: AcademicTerm | null } | { ok: false; error: string } {
  const key = normalizeFriendlyInput(value);
  if (key === "") return { ok: true, value: null };
  const parsed = TERM_ALIASES[key];
  if (parsed) return { ok: true, value: parsed };
  return {
    ok: false,
    error: `Term "${value}" is not recognized. Use 1 or 2 (for example "1st Term").`,
  };
}

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
export function compareSemesters(a: AcademicSemester, b: AcademicSemester): number {
  return SEMESTER_ORDER[a] - SEMESTER_ORDER[b];
}
