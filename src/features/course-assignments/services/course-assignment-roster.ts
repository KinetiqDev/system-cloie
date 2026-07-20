import { randomUUID } from "node:crypto";
import { CourseScope, type Prisma } from "@prisma/client";

import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";

import {
  canManageCourseRoster,
  canMutateCourseRoster,
  canViewCourseRoster,
} from "../policies";
import type {
  AuthorizedRosterAssignment,
  RosterEligibilityProjection,
  RosterEligibilityReason,
  RosterServiceResult,
} from "../types";

const NOT_FOUND_ERROR = "Course assignment not found.";
const SAFE_FAILURE_ERROR = "The roster request could not be completed.";

type AssignmentForRoster = Prisma.CourseAssignmentGetPayload<{
  select: {
    id: true;
    faculty_id: true;
    course_id: true;
    program_id: true;
    term_instance_id: true;
    is_active: true;
    course: { select: { course_scope: true } };
    term_instance: { select: { status: true } };
    course_bound_evaluations: { select: { published_at: true } };
  };
}>;

function unexpectedRosterFailure(
  operation: string,
  actorId: string | undefined,
  assignmentId: string,
  error: unknown
) {
  const referenceId = randomUUID();
  const errorDetails =
    error instanceof Error
      ? {
          name: error.name,
          code:
            typeof error === "object" && error !== null && "code" in error
              ? String(error.code)
              : undefined,
        }
      : { type: typeof error };
  console.error("Course roster request failed", {
    operation,
    actorId: actorId ?? null,
    assignmentId,
    referenceId,
    error: errorDetails,
  });
  return { success: false as const, error: SAFE_FAILURE_ERROR, referenceId };
}

async function resolveProgramHeadScope(userId: string) {
  const rows = await prisma.programHeadAssignment.findMany({
    where: { program_head_id: userId, is_active: true },
    select: { program_id: true },
  });
  return rows.map((row) => row.program_id);
}

async function findAssignment(assignmentId: string): Promise<AssignmentForRoster | null> {
  return prisma.courseAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      faculty_id: true,
      course_id: true,
      program_id: true,
      term_instance_id: true,
      is_active: true,
      course: { select: { course_scope: true } },
      term_instance: { select: { status: true } },
      course_bound_evaluations: { select: { published_at: true } },
    },
  });
}

export async function resolveAuthorizedCourseAssignmentRoster(
  assignmentId: string,
  options: { manage?: boolean } = {}
): Promise<RosterServiceResult<AuthorizedRosterAssignment>> {
  let actorId: string | undefined;

  try {
    const session = await resolveAuthSession();
    if (!session) {
      return { success: false, error: "Authentication required." };
    }
    actorId = session.userId;

    const assignment = await findAssignment(assignmentId);
    if (!assignment) {
      return { success: false, error: NOT_FOUND_ERROR };
    }

    const programHeadProgramIds =
      session.activeRole === ROLES.PROGRAM_HEAD ? await resolveProgramHeadScope(session.userId) : [];
    const policyContext = {
      facultyId: assignment.faculty_id,
      programId: assignment.program_id,
      courseScope: assignment.course.course_scope,
      isActive: assignment.is_active,
    };
    const manageAuthorization = canManageCourseRoster(session, policyContext, programHeadProgramIds);
    const authorization = options.manage ? manageAuthorization : canViewCourseRoster(session, policyContext, programHeadProgramIds);

    if (!authorization.allowed) {
      return { success: false, error: authorization.reason === NOT_FOUND_ERROR ? NOT_FOUND_ERROR : authorization.reason };
    }

    const mutability = canMutateCourseRoster({
      isActive: assignment.is_active,
      periodStatus: assignment.term_instance.status,
      hasPublishedEvaluation: assignment.course_bound_evaluations.some((evaluation) => evaluation.published_at !== null),
    });

    return {
      success: true,
      data: {
        assignmentId: assignment.id,
        facultyId: assignment.faculty_id,
        courseId: assignment.course_id,
        programId: assignment.program_id,
        termInstanceId: assignment.term_instance_id,
        courseScope: assignment.course.course_scope,
        isActive: assignment.is_active,
        periodStatus: assignment.term_instance.status,
        hasPublishedEvaluation: assignment.course_bound_evaluations.some(
          (evaluation) => evaluation.published_at !== null
        ),
        canManage: manageAuthorization.allowed,
        canMutate: mutability.allowed,
        mutabilityReason: mutability.allowed ? null : mutability.reason,
      },
    };
  } catch (error) {
    return unexpectedRosterFailure("resolve_authorized_assignment", actorId, assignmentId, error);
  }
}

export async function resolveCurrentRosterEligibility(
  assignmentId: string,
  studentUserId: string
): Promise<RosterServiceResult<RosterEligibilityProjection>> {
  let actorId: string | undefined;

  try {
    const session = await resolveAuthSession();
    if (!session) {
      return { success: false, error: "Authentication required." };
    }
    actorId = session.userId;

    let assignment: AuthorizedRosterAssignment;
    if (session.activeRole === ROLES.STUDENT) {
      if (session.profileGate.status === "INACTIVE" || studentUserId !== session.userId) {
        return { success: false, error: NOT_FOUND_ERROR };
      }

      const rawAssignment = await findAssignment(assignmentId);
      if (!rawAssignment) {
        return { success: false, error: NOT_FOUND_ERROR };
      }

      const hasPublishedEvaluation = rawAssignment.course_bound_evaluations.some(
        (evaluation) => evaluation.published_at !== null
      );
      const mutability = canMutateCourseRoster({
        isActive: rawAssignment.is_active,
        periodStatus: rawAssignment.term_instance.status,
        hasPublishedEvaluation,
      });
      assignment = {
        assignmentId: rawAssignment.id,
        facultyId: rawAssignment.faculty_id,
        courseId: rawAssignment.course_id,
        programId: rawAssignment.program_id,
        termInstanceId: rawAssignment.term_instance_id,
        courseScope: rawAssignment.course.course_scope,
        isActive: rawAssignment.is_active,
        periodStatus: rawAssignment.term_instance.status,
        hasPublishedEvaluation,
        canManage: false,
        canMutate: mutability.allowed,
        mutabilityReason: mutability.allowed ? null : mutability.reason,
      };
    } else {
      const assignmentResult = await resolveAuthorizedCourseAssignmentRoster(assignmentId);
      if (!assignmentResult.success) {
        return assignmentResult;
      }
      assignment = assignmentResult.data;
    }

    const membership = await prisma.courseAssignmentMembership.findUnique({
      where: {
        course_assignment_id_student_user_id: {
          course_assignment_id: assignment.assignmentId,
          student_user_id: studentUserId,
        },
      },
      select: { id: true, is_active: true },
    });
    if (!membership || !membership.is_active) {
      return { success: false, error: NOT_FOUND_ERROR };
    }

    const student = await prisma.user.findUnique({
      where: { id: studentUserId },
      select: {
        is_active: true,
        roles: { select: { role: true } },
        student_profile: { select: { program_id: true, student_id_number: true } },
        enrollments: {
          where: { term_instance_id: assignment.termInstanceId, is_active: true },
          select: { program_id: true },
        },
      },
    });

    const projection = (reason: RosterEligibilityReason): RosterServiceResult<RosterEligibilityProjection> => ({
      success: true,
      data: { eligible: false, reason },
    });

    if (!student) return projection("UNKNOWN_ACCOUNT");
    if (!student.roles.some((role) => role.role === ROLES.STUDENT)) return projection("NON_STUDENT_ACCOUNT");
    if (!student.is_active) return projection("ACCOUNT_INACTIVE");
    if (
      !student.student_profile ||
      (student.student_profile.student_id_number?.trim().length ?? 0) < 5
    ) {
      return projection("PROFILE_INCOMPLETE");
    }
    if (student.enrollments.length === 0) return projection("NO_ACTIVE_TERM_PLACEMENT");

    if (
      assignment.courseScope === CourseScope.PROGRAM_SPECIFIC &&
      (student.student_profile.program_id !== assignment.programId ||
        student.enrollments[0]?.program_id !== assignment.programId)
    ) {
      return projection("PROGRAM_MISMATCH");
    }

    return { success: true, data: { eligible: true, reason: null } };
  } catch (error) {
    return unexpectedRosterFailure("resolve_current_eligibility", actorId, assignmentId, error);
  }
}
