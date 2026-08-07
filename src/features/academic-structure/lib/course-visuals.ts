import { CourseScope } from "@prisma/client";

/**
 * Theme-resolved categorical chip classes for course scope/type, drawn from
 * the chart token family (design.md 5.5 — chart colors are categorical).
 * Text stays on `foreground` so badge labels hold ≥ 4.5:1 contrast in both
 * themes; the hue is carried by the tinted background and border.
 */
const GENERAL_EDUCATION_CHIP = "border-chart-3/30 bg-chart-3/15 text-foreground";
const PROGRAM_WIDE_CHIP = "border-chart-1/30 bg-chart-1/15 text-foreground";
const MAJOR_SPECIFIC_CHIP = "border-chart-4/30 bg-chart-4/15 text-foreground";

/** Categorical chip for a course scope (general education vs program-specific). */
export function getCourseScopeBadgeClass(scope: CourseScope): string {
  return scope === CourseScope.GENERAL_EDUCATION ? GENERAL_EDUCATION_CHIP : PROGRAM_WIDE_CHIP;
}

/** Categorical chip for a Program Head course type (GE / program-wide / major-specific). */
export function getCourseTypeBadgeClass(scope: CourseScope, majorId: string | null): string {
  if (scope === CourseScope.GENERAL_EDUCATION) return GENERAL_EDUCATION_CHIP;
  return majorId ? MAJOR_SPECIFIC_CHIP : PROGRAM_WIDE_CHIP;
}
