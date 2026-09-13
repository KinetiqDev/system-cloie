import { AcademicSemester, AcademicTerm, StudentSection, YearLevel } from "@prisma/client";

import { YEAR_LEVEL_OPTIONS, getYearLevelDisplay } from "./year-levels";

// Re-export from centralized academic-period module for backward compatibility
export {
  ALLOWED_SEMESTER_TERM_PAIRS,
  formatSchoolYearCode,
  parseSchoolYearCode,
  assertValidSemesterTerm,
  isValidSemesterTerm,
  getSemesterTermLabel,
  getSemesterShortLabel,
  getTermShortLabel,
} from "./academic-period";

export const SEMESTER_OPTIONS = [
  { label: "1st Semester", value: AcademicSemester.FIRST },
  { label: "2nd Semester", value: AcademicSemester.SECOND },
  { label: "Summer", value: AcademicSemester.SUMMER },
] as const;

export const TERM_OPTIONS = [
  { label: "1st Term", value: AcademicTerm.FIRST_TERM },
  { label: "2nd Term", value: AcademicTerm.SECOND_TERM },
] as const;

export const STUDENT_SECTION_OPTIONS = [
  { label: "Morning", value: StudentSection.MORNING },
  { label: "Afternoon", value: StudentSection.AFTERNOON },
  { label: "Evening", value: StudentSection.EVENING },
] as const;

// Re-export year level constants for convenience
export { YEAR_LEVEL_OPTIONS, getYearLevelDisplay };

export function getSectionLabel(section: StudentSection | null | undefined): string {
  if (!section) return "—";
  return STUDENT_SECTION_OPTIONS.find((o) => o.value === section)?.label ?? section;
}

/**
 * Label a Student's term placement from its parts — year level and section of
 * the enrollment row for one Academic Period. A missing placement, or a
 * placement without a section, narrows the label instead of leaving a gap.
 */
export function getPlacementLabel(
  placement: { yearLevel: YearLevel | null; section: StudentSection | null } | null | undefined
): string {
  if (!placement) return "—";
  const parts = [
    getYearLevelDisplay(placement.yearLevel),
    getSectionLabel(placement.section),
  ].filter((label) => label !== "—");
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function getSemesterLabel(value: AcademicSemester | null | undefined) {
  return SEMESTER_OPTIONS.find((option) => option.value === value)?.label ?? "Unknown Semester";
}

export function getTermLabel(value: AcademicTerm | null | undefined) {
  return TERM_OPTIONS.find((option) => option.value === value)?.label ?? "Unknown Term";
}
