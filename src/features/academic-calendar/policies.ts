import { AcademicPeriodStatus, AcademicSemester, AcademicTerm } from "@prisma/client";
import { CANONICAL_TERMS, isValidSemesterTerm } from "@/lib/constants/academic-period";

export type LifecycleTransitionDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Whether a term instance is one of the 5 structural (canonical) terms of a
 * School Year. Structural terms are created with the School Year and must
 * never be deleted.
 */
export function isStructuralTerm(term: {
  semester: AcademicSemester;
  term: AcademicTerm | null | undefined;
}): boolean {
  return CANONICAL_TERMS.some(
    (canonical) =>
      canonical.semester === term.semester && canonical.term === (term.term ?? null)
  );
}

/**
 * Decide whether an Academic Period may move from its current status to a target.
 * Rules (see spec #111):
 * - PLANNED -> ACTIVE | CANCELLED
 * - ACTIVE  -> COMPLETED | CANCELLED
 * - COMPLETED, CANCELLED are immutable
 * - Same-status moves are not allowed (the service should not call them)
 */
export function canTransitionPeriod(
  current: AcademicPeriodStatus,
  target: AcademicPeriodStatus
): LifecycleTransitionDecision {
  if (current === target) {
    return { allowed: false, reason: "Period is already in the target status" };
  }

  if (current === "COMPLETED" || current === "CANCELLED") {
    return { allowed: false, reason: "Completed and cancelled periods are immutable" };
  }

  const allowed: Record<AcademicPeriodStatus, AcademicPeriodStatus[]> = {
    PLANNED: ["ACTIVE", "CANCELLED"],
    ACTIVE: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };

  if (allowed[current].includes(target)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Illegal transition: ${current} -> ${target}`,
  };
}

/**
 * Check if a School Year can be archived.
 * Requirements:
 * - Must not have the active term instance.
 * - Must not already be archived.
 */
export function canArchiveSchoolYear(
  schoolYearId: string,
  activeTermInstanceId: string | null,
  isArchived: boolean,
  schoolYearTermInstanceIds: string[]
): { allowed: true } | { allowed: false; reason: string } {
  if (isArchived) {
    return { allowed: false, reason: "School year is already archived" };
  }
  
  if (activeTermInstanceId && schoolYearTermInstanceIds.includes(activeTermInstanceId)) {
    return { allowed: false, reason: "Cannot archive a school year that contains the active term" };
  }
  
  return { allowed: true };
}

/**
 * Check if a term instance can be set as active.
 * Requirements:
 * - Must not already be active.
 * - Must have valid semester-term combination.
 */
export function canSetActiveTerm(
  termInstanceId: string,
  currentActiveId: string | null,
  semester: AcademicSemester,
  term: string | null | undefined
): { allowed: true } | { allowed: false; reason: string } {
  if (currentActiveId === termInstanceId) {
    return { allowed: false, reason: "Term is already active" };
  }
  
  // Convert term string to enum if needed
  const termEnum = term as import("@prisma/client").AcademicTerm | null | undefined;
  
  if (!isValidSemesterTerm(semester, termEnum)) {
    return { allowed: false, reason: "Invalid semester-term combination" };
  }
  
  return { allowed: true };
}

/**
 * Check if a term instance can be deleted.
 * Requirements:
 * - Must not be the active term.
 * - Should ideally have no dependent records (enrollments, assignments, deployments).
 */
export function canDeleteTermInstance(
  termInstanceId: string,
  activeTermInstanceId: string | null,
  hasDependentRecords: boolean
): { allowed: true } | { allowed: false; reason: string } {
  if (activeTermInstanceId === termInstanceId) {
    return { allowed: false, reason: "Cannot delete the active term instance" };
  }
  
  if (hasDependentRecords) {
    return { allowed: false, reason: "Cannot delete a term that has existing enrollments or deployments" };
  }
  
  return { allowed: true };
}

/**
 * Check if a School Year can be deleted.
 * Requirements:
 * - Must be archived.
 * - Must have no dependent records across all its term instances.
 */
export function canDeleteSchoolYear(
  isArchived: boolean,
  hasDependentRecords: boolean
): { allowed: true } | { allowed: false; reason: string } {
  if (!isArchived) {
    return { allowed: false, reason: "Must archive the school year before deleting" };
  }
  
  if (hasDependentRecords) {
    return { allowed: false, reason: "Cannot delete a school year with existing enrollments or deployments" };
  }
  
  return { allowed: true };
}
