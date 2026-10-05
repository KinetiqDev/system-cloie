import { AcademicPeriodStatus, AcademicSemester } from "@prisma/client";

export type LifecycleTransitionDecision = { allowed: true } | { allowed: false; reason: string };

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
 * Check if a School Year can be activated.
 * Requirements:
 * - Must not already be active.
 * - Must have an active_semester set before activation.
 */
export function canActivateSchoolYear(
  isActive: boolean,
  activeSemester: AcademicSemester | null
): { allowed: true } | { allowed: false; reason: string } {
  if (isActive) {
    return { allowed: false, reason: "School year is already active" };
  }

  if (activeSemester === null) {
    return {
      allowed: false,
      reason: "Set an active semester before activating the school year",
    };
  }

  return { allowed: true };
}

/**
 * Check if a School Year can be deactivated.
 * Requirements:
 * - Must currently be active.
 * - Must not contain an ACTIVE AcademicTermInstance.
 */
export function canDeactivateSchoolYear(
  isActive: boolean,
  hasActivePeriod: boolean
): { allowed: true } | { allowed: false; reason: string } {
  if (!isActive) {
    return { allowed: false, reason: "School year is not active" };
  }

  if (hasActivePeriod) {
    return {
      allowed: false,
      reason: "Cannot deactivate a school year that contains an active period",
    };
  }

  return { allowed: true };
}

/**
 * Check if an active semester can be set on a School Year.
 * Requirements:
 * - School Year must be active.
 * - Semester must be one of FIRST, SECOND, SUMMER (never null).
 */
export function canSetActiveSemester(
  isActive: boolean,
  semester: AcademicSemester | null
): { allowed: true } | { allowed: false; reason: string } {
  if (!isActive) {
    return {
      allowed: false,
      reason: "Activate the school year before setting an active semester",
    };
  }

  if (semester === null) {
    return { allowed: false, reason: "A semester is required" };
  }

  return { allowed: true };
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
