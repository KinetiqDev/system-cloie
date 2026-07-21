import { ROLES } from "@/lib/constants/roles";
import { AcademicPeriodStatus, CourseScope, type SystemRole } from "@prisma/client";
import type { AuthSessionSnapshot } from "@/features/auth/services/build-auth-session-snapshot";

export type RosterAuthorizationDecision = { allowed: true } | { allowed: false; reason: string };

export type CourseRosterPolicyContext = {
  facultyId: string;
  programId: string;
  courseScope: CourseScope;
  isActive: boolean;
};

export type CourseRosterMutabilityContext = {
  isActive: boolean;
  periodStatus: AcademicPeriodStatus;
  hasPublishedEvaluation: boolean;
};

/**
 * Roster authorization intentionally uses only the active portal role. The role
 * list is retained on the session for other flows, but must not widen this boundary.
 */
export function canViewCourseRoster(
  session: AuthSessionSnapshot | null,
  assignment: CourseRosterPolicyContext,
  programHeadProgramIds: string[] = []
): RosterAuthorizationDecision {
  if (!session) {
    return { allowed: false, reason: "Authentication required." };
  }

  if (session.profileGate.status === "INACTIVE") {
    return { allowed: false, reason: "Course assignment not found." };
  }

  switch (session.activeRole) {
    case ROLES.SECRETARY:
    case ROLES.DEAN:
      return { allowed: true };
    case ROLES.FACULTY:
      return assignment.facultyId === session.userId
        ? { allowed: true }
        : { allowed: false, reason: "Course assignment not found." };
    case ROLES.PROGRAM_HEAD:
      return programHeadProgramIds.includes(assignment.programId)
        ? { allowed: true }
        : { allowed: false, reason: "Course assignment not found." };
    default:
      return { allowed: false, reason: "Course assignment not found." };
  }
}

export function canManageCourseRoster(
  session: AuthSessionSnapshot | null,
  assignment: CourseRosterPolicyContext,
  programHeadProgramIds: string[] = []
): RosterAuthorizationDecision {
  const viewDecision = canViewCourseRoster(session, assignment, programHeadProgramIds);
  if (!viewDecision.allowed) {
    return viewDecision;
  }

  if (session?.activeRole === ROLES.FACULTY && !assignment.isActive) {
    return { allowed: false, reason: "Course assignment not found." };
  }

  if (
    session?.activeRole === ROLES.PROGRAM_HEAD &&
    assignment.courseScope === CourseScope.GENERAL_EDUCATION
  ) {
    return { allowed: false, reason: "Program Heads cannot manage General Education assignments." };
  }

  return { allowed: true };
}

export function canMutateCourseRoster(context: CourseRosterMutabilityContext):
  | { allowed: true }
  | {
      allowed: false;
      reason: "INACTIVE_ASSIGNMENT" | "INACTIVE_ACADEMIC_PERIOD" | "PUBLISHED_EVALUATION_LOCK";
    } {
  if (!context.isActive) {
    return { allowed: false, reason: "INACTIVE_ASSIGNMENT" };
  }

  if (context.periodStatus !== "ACTIVE") {
    return { allowed: false, reason: "INACTIVE_ACADEMIC_PERIOD" };
  }

  if (context.hasPublishedEvaluation) {
    return { allowed: false, reason: "PUBLISHED_EVALUATION_LOCK" };
  }

  return { allowed: true };
}

/**
 * Check if user can manage course assignments.
 * Program Heads can manage only Program-specific Courses within their program scope.
 * Admins and Deans can manage any course.
 * Faculty cannot manage assignments (they are assigned by PH/Admin).
 */
export function canManageCourseAssignment(
  session: AuthSessionSnapshot | null,
  courseProgramId: string | null,
  phProgramScope: string[] = []
): { allowed: true } | { allowed: false; reason: string } {
  if (!session) {
    return { allowed: false, reason: "Authentication required." };
  }

  switch (session.activeRole) {
    case ROLES.SECRETARY:
    case ROLES.DEAN:
      return { allowed: true };
    case ROLES.PROGRAM_HEAD:
      if (courseProgramId === null) {
        return {
          allowed: false,
          reason: "Program Heads cannot manage General Education assignments.",
        };
      }

      return phProgramScope.includes(courseProgramId)
        ? { allowed: true }
        : { allowed: false, reason: "Course is outside your program scope." };
    default:
      return { allowed: false, reason: "Insufficient permissions." };
  }
}

/**
 * Check if user can view course assignments.
 */
export function canViewCourseAssignments(
  session: AuthSessionSnapshot | null
): { allowed: true } | { allowed: false; reason: string } {
  if (!session) {
    return { allowed: false, reason: "Authentication required." };
  }

  const allowedRoles: SystemRole[] = [
    ROLES.SECRETARY,
    ROLES.DEAN,
    ROLES.PROGRAM_HEAD,
    ROLES.FACULTY,
  ];

  if (session.activeRole && allowedRoles.includes(session.activeRole)) {
    return { allowed: true };
  }

  return { allowed: false, reason: "Insufficient permissions." };
}
