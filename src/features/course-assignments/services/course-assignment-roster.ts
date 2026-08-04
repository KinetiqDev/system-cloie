import { randomUUID } from "node:crypto";
import { CourseScope, type Prisma, type SystemRole } from "@prisma/client";

import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";

import { canManageCourseRoster, canMutateCourseRoster, canViewCourseRoster } from "../policies";
import type {
  AuthorizedRosterAssignment,
  RosterEligibilityProjection,
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

export type RosterEligibilityStudent = {
  is_active: boolean;
  roles: Array<{ role: SystemRole }>;
  student_profile: { program_id: string; student_id_number: string | null } | null;
  enrollments: Array<{ program_id: string }>;
};

export type CourseBoundEvaluationEligibilityAssignment = Pick<
  AuthorizedRosterAssignment,
  "assignmentId" | "courseScope" | "programId" | "termInstanceId"
>;

type CourseBoundEvaluationAssignmentRecord = {
  id: string;
  program_id: string;
  term_instance_id: string;
  course: { course_scope: CourseScope };
};

export type CourseBoundEvaluationEligibilityInput = {
  assignment: CourseBoundEvaluationEligibilityAssignment;
  membershipActive: boolean;
  student: RosterEligibilityStudent | null;
};

export function projectRosterEligibility(
  assignment: Pick<AuthorizedRosterAssignment, "courseScope" | "programId">,
  student: RosterEligibilityStudent | null
): RosterEligibilityProjection {
  if (!student) return { eligible: false, reason: "UNKNOWN_ACCOUNT" };
  if (!student.roles.some((role) => role.role === ROLES.STUDENT)) {
    return { eligible: false, reason: "NON_STUDENT_ACCOUNT" };
  }
  if (!student.is_active) return { eligible: false, reason: "ACCOUNT_INACTIVE" };
  if (
    !student.student_profile ||
    (student.student_profile.student_id_number?.trim().length ?? 0) < 5
  ) {
    return { eligible: false, reason: "PROFILE_INCOMPLETE" };
  }
  if (student.enrollments.length === 0) {
    return { eligible: false, reason: "NO_ACTIVE_TERM_PLACEMENT" };
  }
  if (
    assignment.courseScope === CourseScope.PROGRAM_SPECIFIC &&
    (student.student_profile.program_id !== assignment.programId ||
      student.enrollments[0]?.program_id !== assignment.programId)
  ) {
    return { eligible: false, reason: "PROGRAM_MISMATCH" };
  }
  return { eligible: true, reason: null };
}

export function toCourseBoundEvaluationEligibilityAssignment(
  assignment: CourseBoundEvaluationAssignmentRecord
): CourseBoundEvaluationEligibilityAssignment {
  return {
    assignmentId: assignment.id,
    courseScope: assignment.course.course_scope,
    programId: assignment.program_id,
    termInstanceId: assignment.term_instance_id,
  };
}

export function projectCourseBoundEvaluationEligibility({
  assignment,
  membershipActive,
  student,
}: CourseBoundEvaluationEligibilityInput): RosterEligibilityProjection {
  if (!membershipActive) return { eligible: false, reason: null };
  return projectRosterEligibility(assignment, student);
}

export async function resolveCourseBoundEvaluationEligibility(
  assignment: CourseBoundEvaluationEligibilityAssignment,
  studentUserId: string
): Promise<RosterEligibilityProjection> {
  const membership = await prisma.courseAssignmentMembership.findUnique({
    where: {
      course_assignment_id_student_user_id: {
        course_assignment_id: assignment.assignmentId,
        student_user_id: studentUserId,
      },
    },
    select: {
      is_active: true,
      student: {
        select: {
          is_active: true,
          roles: { select: { role: true } },
          student_profile: { select: { program_id: true, student_id_number: true } },
          enrollments: {
            where: { term_instance_id: assignment.termInstanceId, is_active: true },
            select: { program_id: true },
          },
        },
      },
    },
  });

  return projectCourseBoundEvaluationEligibility({
    assignment,
    membershipActive: membership?.is_active ?? false,
    student: membership?.student ?? null,
  });
}

export async function resolveCourseBoundEvaluationEligibilities(
  assignments: CourseBoundEvaluationEligibilityAssignment[],
  studentUserId: string
): Promise<Map<string, RosterEligibilityProjection>> {
  if (assignments.length === 0) return new Map();

  const assignmentIds = [...new Set(assignments.map((assignment) => assignment.assignmentId))];
  const memberships = await prisma.courseAssignmentMembership.findMany({
    where: {
      course_assignment_id: { in: assignmentIds },
      student_user_id: studentUserId,
    },
    select: {
      course_assignment_id: true,
      is_active: true,
      student: {
        select: {
          is_active: true,
          roles: { select: { role: true } },
          student_profile: { select: { program_id: true, student_id_number: true } },
          enrollments: {
            where: { is_active: true },
            select: { program_id: true, term_instance_id: true },
          },
        },
      },
    },
  });

  const membershipsByAssignmentId = new Map(
    memberships.map((membership) => [membership.course_assignment_id, membership])
  );

  return new Map(
    assignments.map((assignment) => {
      const membership = membershipsByAssignmentId.get(assignment.assignmentId);

      return [
        assignment.assignmentId,
        projectCourseBoundEvaluationEligibility({
          assignment,
          membershipActive: membership?.is_active ?? false,
          student: membership
            ? {
                ...membership.student,
                enrollments: membership.student.enrollments
                  .filter((enrollment) => enrollment.term_instance_id === assignment.termInstanceId)
                  .map((enrollment) => ({ program_id: enrollment.program_id })),
              }
            : null,
        }),
      ];
    })
  );
}

export async function countEligibleCourseBoundEvaluationAssignments(
  where: Prisma.EvaluationAssignmentWhereInput
) {
  const assignments = await prisma.evaluationAssignment.findMany({
    where,
    select: {
      respondent_id: true,
      course_bound: {
        select: {
          course_assignment: {
            select: {
              id: true,
              program_id: true,
              term_instance_id: true,
              course: { select: { course_scope: true } },
            },
          },
        },
      },
    },
  });

  const courseAssignmentIds = assignments
    .map((assignment) => assignment.course_bound?.course_assignment)
    .filter((assignment): assignment is NonNullable<typeof assignment> => Boolean(assignment))
    .map((assignment) => assignment.id);
  if (courseAssignmentIds.length === 0) return 0;

  const memberships = await prisma.courseAssignmentMembership.findMany({
    where: { course_assignment_id: { in: courseAssignmentIds }, is_active: true },
    select: {
      course_assignment_id: true,
      student_user_id: true,
      student: {
        select: {
          is_active: true,
          roles: { select: { role: true } },
          student_profile: { select: { program_id: true, student_id_number: true } },
          enrollments: {
            where: { is_active: true },
            select: { program_id: true, term_instance_id: true },
          },
        },
      },
    },
  });
  const membershipsByKey = new Map(
    memberships.map((membership) => [
      `${membership.course_assignment_id}:${membership.student_user_id}`,
      membership,
    ])
  );

  const eligibleAssignments = assignments.filter((assignment) => {
    const courseAssignment = assignment.course_bound?.course_assignment;
    if (!courseAssignment) return false;
    const membership = membershipsByKey.get(`${courseAssignment.id}:${assignment.respondent_id}`);
    const eligibilityAssignment = toCourseBoundEvaluationEligibilityAssignment(courseAssignment);
    return projectCourseBoundEvaluationEligibility({
      assignment: eligibilityAssignment,
      membershipActive: Boolean(membership),
      student: membership
        ? {
            ...membership.student,
            enrollments: membership.student.enrollments
              .filter(
                (enrollment) => enrollment.term_instance_id === courseAssignment.term_instance_id
              )
              .map((enrollment) => ({ program_id: enrollment.program_id })),
          }
        : null,
    }).eligible;
  });

  return eligibleAssignments.length;
}

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
  options: { manage?: boolean; programId?: string } = {}
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

    if (session.activeRole === ROLES.PROGRAM_HEAD) {
      if (!options.programId) return { success: false, error: NOT_FOUND_ERROR };
      const context = await resolveProgramHeadContext(options.programId);
      if (!context.success) return { success: false, error: NOT_FOUND_ERROR };
    }

    if (
      session.activeRole === ROLES.PROGRAM_HEAD &&
      assignment.program_id !== options.programId
    ) {
      return { success: false, error: NOT_FOUND_ERROR };
    }

    const programHeadProgramIds =
      session.activeRole === ROLES.PROGRAM_HEAD
        ? await resolveProgramHeadScope(session.userId)
        : [];
    const policyContext = {
      facultyId: assignment.faculty_id,
      programId: assignment.program_id,
      courseScope: assignment.course.course_scope,
      isActive: assignment.is_active,
    };
    const manageAuthorization = canManageCourseRoster(
      session,
      policyContext,
      programHeadProgramIds
    );
    const authorization = options.manage
      ? manageAuthorization
      : canViewCourseRoster(session, policyContext, programHeadProgramIds);

    if (!authorization.allowed) {
      return {
        success: false,
        error: authorization.reason === NOT_FOUND_ERROR ? NOT_FOUND_ERROR : authorization.reason,
      };
    }

    const mutability = canMutateCourseRoster({
      isActive: assignment.is_active,
      periodStatus: assignment.term_instance.status,
      hasPublishedEvaluation: assignment.course_bound_evaluations.some(
        (evaluation) => evaluation.published_at !== null
      ),
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

    return {
      success: true,
      data: projectRosterEligibility(assignment, student),
    };
  } catch (error) {
    return unexpectedRosterFailure("resolve_current_eligibility", actorId, assignmentId, error);
  }
}
