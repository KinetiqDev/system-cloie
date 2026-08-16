import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";

import type {
  AuthorizedRosterAssignment,
  RosterEligibilityReason,
  RosterServiceResult,
  ScopedRosterCandidate,
} from "../types";
import {
  projectRosterEligibility,
  resolveAuthorizedCourseAssignmentRoster,
  rosterStudentProfileSelect,
  type RosterEligibilityStudent,
} from "./course-assignment-roster";

type ScopedRosterCandidates = {
  assignment: AuthorizedRosterAssignment;
  candidates: ScopedRosterCandidate[];
};

type CandidatePlacement = {
  program_id: string;
  year_level: string | null;
  section: string | null;
  program: { code: string; name: string } | null;
  major: { name: string } | null;
} | undefined;

function toScopedCandidate(
  student: {
    id: string;
    name: string;
    email: string;
    student_profile: { program_id: string | null } | null;
  },
  eligibility: { eligible: boolean; reason: RosterEligibilityReason | null },
  placement: CandidatePlacement
): ScopedRosterCandidate {
  const context = placement
    ? {
        programCode: placement.program ? placement.program.code : null,
        programName: placement.program ? placement.program.name : null,
        yearLevel: placement.year_level,
        section: placement.section,
        majorName: placement.major ? placement.major.name : null,
      }
    : { programCode: null, programName: null, yearLevel: null, section: null, majorName: null };
  return {
    userId: student.id,
    name: student.name,
    email: student.email,
    programId: student.student_profile?.program_id ?? "",
    ...context,
    selectable: eligibility.eligible,
    reason: eligibility.reason,
  };
}

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
      student_profile: {
        select: {
          ...rosterStudentProfileSelect,
          major: { select: { name: true, is_active: true, program_id: true } },
        },
      },
      enrollments: {
        where: { term_instance_id: assignment.termInstanceId, is_active: true },
        select: {
          program_id: true,
          year_level: true,
          section: true,
          program: { select: { code: true, name: true } },
          major: { select: { name: true } },
        },
      },
    },
  });

  // A program-specific roster manager may diagnose ineligible accounts only
  // inside the assignment's academic neighborhood. Program-mismatched accounts
  // are neither selectable nor safe to disclose through preview or search.
  const candidates = students
    .map((student) => {
      const eligibility = projectRosterEligibility(
        { courseScope: assignment.courseScope, programId: assignment.programId },
        student as RosterEligibilityStudent
      );
      const placement = student.enrollments[0];
      return toScopedCandidate(student, eligibility, placement);
    })
    .filter((candidate) => candidate.reason !== "PROGRAM_MISMATCH");

  return {
    success: true,
    data: { assignment, candidates },
  };
}
