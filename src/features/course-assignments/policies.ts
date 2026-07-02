import { ROLES } from "@/lib/constants/roles";
import type { SystemRole } from "@prisma/client";
import type { AuthSessionSnapshot } from "@/features/auth/services/build-auth-session-snapshot";

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

  // Admin and Dean can manage any course
  if (session.roles.includes(ROLES.SECRETARY) || session.roles.includes(ROLES.DEAN)) {
    return { allowed: true };
  }

  // Program Head can manage only Program-specific Courses in their scope.
  if (session.roles.includes(ROLES.PROGRAM_HEAD)) {
    if (courseProgramId === null) {
      return { allowed: false, reason: "Program Heads cannot manage General Education assignments." };
    }

    if (phProgramScope.includes(courseProgramId)) {
      return { allowed: true };
    }

    return { allowed: false, reason: "Course is outside your program scope." };
  }

  return { allowed: false, reason: "Insufficient permissions." };
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

  if (session.roles.some((r) => allowedRoles.includes(r))) {
    return { allowed: true };
  }

  return { allowed: false, reason: "Insufficient permissions." };
}
