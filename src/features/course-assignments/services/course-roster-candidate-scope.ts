import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";

import type {
  AuthorizedRosterAssignment,
  RosterServiceResult,
  ScopedRosterCandidate,
} from "../types";
import {
  projectRosterEligibility,
  resolveAuthorizedCourseAssignmentRoster,
  rosterStudentProfileSelect,
  type RosterEligibilityStudent,
} from "./course-assignment-roster";

export type { ScopedRosterCandidate } from "../types";

export type ScopedRosterCandidates = {
  assignment: AuthorizedRosterAssignment;
  candidates: ScopedRosterCandidate[];
};

/**
 * Loads the single server-authorized candidate population shared by roster
 * preview and interactive search. Callers may narrow results in memory, but
 * must not widen this assignment-period eligibility scope.
 */
export async function loadScopedRosterCandidates(
  assignmentId: string,
  programId?: string
): Promise<RosterServiceResult<ScopedRosterCandidates>> {
  const authorization = await resolveAuthorizedCourseAssignmentRoster(assignmentId, {
    manage: true,
    programId,
  });
  if (!authorization.success) return authorization;

  const assignment = authorization.data;
  const students = await prisma.user.findMany({
    where: {
      roles: { some: { role: ROLES.STUDENT } },
      is_active: true,
      student_profile: { isNot: null },
      enrollments: {
        some: { term_instance_id: assignment.termInstanceId, is_active: true },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      roles: { select: { role: true } },
      is_active: true,
      student_profile: { select: rosterStudentProfileSelect },
      enrollments: {
        where: { term_instance_id: assignment.termInstanceId, is_active: true },
        select: { program_id: true },
      },
    },
  });

  return {
    success: true,
    data: {
      assignment,
      candidates: students.map((student) => {
        const eligibility = projectRosterEligibility(
          { courseScope: assignment.courseScope, programId: assignment.programId },
          student as RosterEligibilityStudent
        );
        return {
          userId: student.id,
          name: student.name,
          email: student.email,
          programId: student.student_profile?.program_id ?? "",
          selectable: eligibility.eligible,
          reason: eligibility.reason,
        };
      }),
    },
  };
}
