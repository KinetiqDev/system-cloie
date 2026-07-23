import { ROLES } from "@/lib/constants/roles";
import { CourseScope } from "@prisma/client";
import type { AuthSessionSnapshot } from "@/features/auth/services/build-auth-session-snapshot";

export interface CourseAssignmentContext {
  faculty_id: string;
  program_id: string | null;
  course_scope: CourseScope;
}

/**
 * Check if user can deploy a course-bound evaluation for a given assignment.
 *
 * Authorization rules:
 * - Faculty: Can only deploy their own assignments (self-deploy)
 * - Program Head: Can deploy on-behalf for program-specific assignments in their scope
 * - Dean/Secretary: Can deploy on-behalf for any assignment
 *
 * @param session - Auth session with roles
 * @param assignment - Course assignment context (faculty_id, program_id, course_scope)
 * @param phProgramScope - List of program IDs the PH has scope over
 */
export function canDeployCourseBoundEvaluation(
  session: AuthSessionSnapshot | null,
  assignment: CourseAssignmentContext,
  phProgramScope: string[] = []
): { allowed: true } | { allowed: false; reason: string } {
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
    case ROLES.PROGRAM_HEAD:
      if (assignment.course_scope === CourseScope.GENERAL_EDUCATION) {
        return {
          allowed: false,
          reason: "Program Heads cannot publish General Education evaluations.",
        };
      }
      return assignment.program_id && phProgramScope.includes(assignment.program_id)
        ? { allowed: true }
        : { allowed: false, reason: "Course is outside your program scope." };
    case ROLES.FACULTY:
      return assignment.faculty_id === session.userId
        ? { allowed: true }
        : {
            allowed: false,
            reason: "Only the assigned faculty member can deploy this evaluation.",
          };
    default:
      return { allowed: false, reason: "Insufficient permissions." };
  }
}
