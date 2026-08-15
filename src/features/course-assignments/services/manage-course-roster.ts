import { randomUUID } from "node:crypto";
import { Prisma, type CourseScope, type SystemRole } from "@prisma/client";

import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import { ROLES } from "@/lib/constants/roles";

import {
  projectRosterEligibility,
  resolveAuthorizedCourseAssignmentRoster,
  rosterStudentProfileSelect,
  type RosterEligibilityStudent,
} from "./course-assignment-roster";
import { revalidateProgramHeadAssignment } from "@/features/auth/services/resolve-program-head-context";
import { canManageCourseRoster } from "../policies";
import type { CourseRosterMutation, RosterServiceResult } from "../types";

const NOT_FOUND_ERROR = "Course assignment not found.";
const SAFE_FAILURE_ERROR = "The roster request could not be completed.";

const eligibilityMessages = {
  UNKNOWN_ACCOUNT: "No matching account was found.",
  NON_STUDENT_ACCOUNT: "Account is not a Student account.",
  ACCOUNT_INACTIVE: "Student account is inactive.",
  PROFILE_INCOMPLETE: "Student profile is incomplete.",
  NO_ACTIVE_TERM_PLACEMENT: "Student has no active term placement for this Academic Period.",
  PROGRAM_MISMATCH: "Student does not match this Course assignment program.",
} as const;

const mutabilityMessages = {
  INACTIVE_ASSIGNMENT: "This Course assignment is inactive. The roster is read-only.",
  INACTIVE_ACADEMIC_PERIOD: "This Academic Period is no longer active. The roster is read-only.",
  PUBLISHED_EVALUATION_LOCK:
    "A Course-bound evaluation has been published for this assignment. The roster is locked.",
} as const;

type WriteAssignment = {
  id: string;
  faculty_id: string;
  course_id: string;
  program_id: string;
  term_instance_id: string;
  is_active: boolean;
  course: { course_scope: CourseScope };
  term_instance: { status: "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED" };
  course_bound_evaluations: Array<{ published_at: Date | null }>;
};

const assignmentSelect = {
  id: true,
  faculty_id: true,
  course_id: true,
  program_id: true,
  term_instance_id: true,
  is_active: true,
  course: { select: { course_scope: true } },
  term_instance: { select: { status: true } },
  course_bound_evaluations: { select: { published_at: true } },
} as const;

const studentSelect = (termInstanceId: string) => ({
  id: true,
  email: true,
  is_active: true,
  roles: { select: { role: true } },
  student_profile: { select: rosterStudentProfileSelect },
  enrollments: {
    where: { term_instance_id: termInstanceId, is_active: true },
    select: { program_id: true },
  },
});

function mutabilityReason(
  assignment: Pick<WriteAssignment, "is_active" | "term_instance" | "course_bound_evaluations">
) {
  if (!assignment.is_active) return "INACTIVE_ASSIGNMENT" as const;
  if (assignment.term_instance.status !== "ACTIVE") return "INACTIVE_ACADEMIC_PERIOD" as const;
  if (assignment.course_bound_evaluations.some((evaluation) => evaluation.published_at !== null)) {
    return "PUBLISHED_EVALUATION_LOCK" as const;
  }
  return null;
}

function safeMutabilityFailure(assignment: WriteAssignment): RosterServiceResult<never> | null {
  const reason = mutabilityReason(assignment);
  return reason ? { success: false, error: mutabilityMessages[reason] } : null;
}

function studentForEligibility(student: {
  is_active: boolean;
  roles: Array<{ role: SystemRole }>;
  student_profile: RosterEligibilityStudent["student_profile"];
  enrollments: Array<{ program_id: string }>;
}): RosterEligibilityStudent {
  return {
    is_active: student.is_active,
    roles: student.roles,
    student_profile: student.student_profile,
    enrollments: student.enrollments,
  };
}

function isUniqueError(error: unknown) {
  return (
    isUniqueConstraintError(error) ||
    (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
  );
}

function isPublishedLockError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("Course-assignment roster is locked after evaluation publication")
  );
}

function unexpectedRosterFailure(
  operation: string,
  actorId: string | undefined,
  assignmentId: string,
  error: unknown
) {
  const referenceId = randomUUID();
  console.error("Course roster write failed", {
    operation,
    actorId: actorId ?? null,
    assignmentId,
    referenceId,
    error:
      error instanceof Error
        ? {
            name: error.name,
            code:
              typeof error === "object" && error !== null && "code" in error
                ? String(error.code)
                : undefined,
          }
        : { type: typeof error },
  });
  return { success: false as const, error: SAFE_FAILURE_ERROR, referenceId };
}

async function authorizeForWrite(assignmentId: string, programId?: string) {
  const authorization = await resolveAuthorizedCourseAssignmentRoster(assignmentId, {
    manage: true,
    programId,
  });
  if (!authorization.success) return authorization;
  if (!authorization.data.canManage) return { success: false as const, error: NOT_FOUND_ERROR };
  if (!authorization.data.canMutate) {
    return {
      success: false as const,
      error: mutabilityMessages[authorization.data.mutabilityReason!],
    };
  }
  return authorization;
}

async function lockAssignment(tx: Prisma.TransactionClient, assignmentId: string) {
  await tx.$queryRaw`
    SELECT id
    FROM "course_assignments"
    WHERE id = ${assignmentId}::uuid
    FOR UPDATE
  `;
  return tx.courseAssignment.findUnique({ where: { id: assignmentId }, select: assignmentSelect });
}

async function confirmWriteAuthorization(
  tx: Prisma.TransactionClient,
  session: NonNullable<Awaited<ReturnType<typeof resolveAuthSession>>>,
  assignment: WriteAssignment,
  programId?: string
) {
  if (session.activeRole === ROLES.PROGRAM_HEAD) {
    const selectedProgram = programId
      ? await revalidateProgramHeadAssignment(tx, { userId: session.userId, programId })
      : null;
    if (!selectedProgram || assignment.program_id !== selectedProgram.id) return false;
  }

  const programHeadProgramIds =
    session.activeRole === ROLES.PROGRAM_HEAD
      ? (
          await tx.programHeadAssignment.findMany({
            where: { program_head_id: session.userId, is_active: true },
            select: { program_id: true },
          })
        ).map((row) => row.program_id)
      : [];
  return canManageCourseRoster(
    session,
    {
      facultyId: assignment.faculty_id,
      programId: assignment.program_id,
      courseScope: assignment.course.course_scope,
      isActive: assignment.is_active,
    },
    programHeadProgramIds
  );
}

async function activeSectionConflict(
  tx: Prisma.TransactionClient,
  assignment: WriteAssignment,
  studentUserId: string
) {
  return tx.courseAssignmentMembership.findFirst({
    where: {
      student_user_id: studentUserId,
      course_id: assignment.course_id,
      term_instance_id: assignment.term_instance_id,
      program_id: assignment.program_id,
      is_active: true,
      course_assignment_id: { not: assignment.id },
    },
    select: { id: true },
  });
}

function activeSectionError() {
  return {
    success: false as const,
    error: "Student is already active in another section for this Course and Academic Period.",
  };
}

async function uniqueMembershipError(
  assignmentId: string,
  studentUserId: string | undefined,
  tx?: Prisma.TransactionClient
) {
  if (studentUserId) {
    const db = tx ?? prisma;
    const membership = await db.courseAssignmentMembership.findUnique({
      where: {
        course_assignment_id_student_user_id: {
          course_assignment_id: assignmentId,
          student_user_id: studentUserId,
        },
      },
      select: { is_active: true },
    });
    if (membership?.is_active) {
      return {
        success: false as const,
        error: "Student is already an active member of this Course roster.",
      };
    }
  }
  return activeSectionError();
}

export async function addRosterMembership(
  assignmentId: string,
  studentEmail: string,
  programId?: string
): Promise<RosterServiceResult<CourseRosterMutation>> {
  let actorId: string | undefined;
  let studentUserId: string | undefined;
  try {
    const session = await resolveAuthSession();
    if (!session) return { success: false, error: "Authentication required." };
    actorId = session.userId;
    const authorization = await authorizeForWrite(assignmentId, programId);
    if (!authorization.success) return authorization;

    const email = studentEmail.trim().toLowerCase();
    return await prisma.$transaction(async (tx) => {
      const assignment = await lockAssignment(tx, assignmentId);
      if (!assignment) return { success: false, error: NOT_FOUND_ERROR };
      const authorization = await confirmWriteAuthorization(tx, session, assignment, programId);
      if (authorization === false || !authorization.allowed) {
        return { success: false, error: NOT_FOUND_ERROR };
      }
      const lifecycleFailure = safeMutabilityFailure(assignment);
      if (lifecycleFailure) return lifecycleFailure;

      const student = await tx.user.findUnique({
        where: { email },
        select: studentSelect(assignment.term_instance_id),
      });
      if (!student) return { success: false, error: eligibilityMessages.UNKNOWN_ACCOUNT };
      studentUserId = student.id;

      const existing = await tx.courseAssignmentMembership.findUnique({
        where: {
          course_assignment_id_student_user_id: {
            course_assignment_id: assignment.id,
            student_user_id: student.id,
          },
        },
        select: { id: true, is_active: true },
      });
      if (existing?.is_active) {
        return {
          success: false,
          error: "Student is already an active member of this Course roster.",
        };
      }

      const projection = projectRosterEligibility(
        { courseScope: assignment.course.course_scope, programId: assignment.program_id },
        studentForEligibility(student)
      );
      if (!projection.eligible) {
        return { success: false, error: eligibilityMessages[projection.reason!] };
      }

      if (await activeSectionConflict(tx, assignment, student.id)) return activeSectionError();

      if (existing) {
        await tx.courseAssignmentMembership.update({
          where: { id: existing.id },
          data: { is_active: true, updated_by: session.userId, removed_by: null, removed_at: null },
        });
        return {
          success: true,
          data: { outcome: "RESTORED", message: "Student membership restored." },
        };
      }

      await tx.courseAssignmentMembership.create({
        data: {
          course_assignment_id: assignment.id,
          student_user_id: student.id,
          course_id: assignment.course_id,
          term_instance_id: assignment.term_instance_id,
          program_id: assignment.program_id,
          created_by: session.userId,
          updated_by: session.userId,
        },
      });
      return {
        success: true,
        data: { outcome: "CREATED", message: "Student added to Course roster." },
      };
    });
  } catch (error) {
    if (isUniqueError(error)) return uniqueMembershipError(assignmentId, studentUserId);
    if (isPublishedLockError(error)) {
      return { success: false, error: mutabilityMessages.PUBLISHED_EVALUATION_LOCK };
    }
    return unexpectedRosterFailure("add_membership", actorId, assignmentId, error);
  }
}

export async function restoreRosterMembership(
  assignmentId: string,
  membershipId: string,
  programId?: string
): Promise<RosterServiceResult<CourseRosterMutation>> {
  let actorId: string | undefined;
  let studentUserId: string | undefined;
  try {
    const session = await resolveAuthSession();
    if (!session) return { success: false, error: "Authentication required." };
    actorId = session.userId;
    const authorization = await authorizeForWrite(assignmentId, programId);
    if (!authorization.success) return authorization;

    return await prisma.$transaction(async (tx) => {
      const assignment = await lockAssignment(tx, assignmentId);
      if (!assignment) return { success: false, error: NOT_FOUND_ERROR };
      const authorization = await confirmWriteAuthorization(tx, session, assignment, programId);
      if (authorization === false || !authorization.allowed) {
        return { success: false, error: NOT_FOUND_ERROR };
      }
      const lifecycleFailure = safeMutabilityFailure(assignment);
      if (lifecycleFailure) return lifecycleFailure;

      const membership = await tx.courseAssignmentMembership.findUnique({
        where: { id: membershipId },
        select: {
          id: true,
          course_assignment_id: true,
          student_user_id: true,
          is_active: true,
          created_by: true,
          created_at: true,
        },
      });
      if (!membership || membership.course_assignment_id !== assignment.id) {
        return { success: false, error: "Roster membership not found." };
      }
      studentUserId = membership.student_user_id;
      if (membership.is_active) {
        return {
          success: false,
          error: "Student is already an active member of this Course roster.",
        };
      }

      const student = await tx.user.findUnique({
        where: { id: membership.student_user_id },
        select: studentSelect(assignment.term_instance_id),
      });
      const projection = projectRosterEligibility(
        { courseScope: assignment.course.course_scope, programId: assignment.program_id },
        student ? studentForEligibility(student) : null
      );
      if (!projection.eligible) {
        return { success: false, error: eligibilityMessages[projection.reason!] };
      }
      if (await activeSectionConflict(tx, assignment, membership.student_user_id)) {
        return activeSectionError();
      }

      await tx.courseAssignmentMembership.update({
        where: { id: membership.id },
        data: { is_active: true, updated_by: session.userId, removed_by: null, removed_at: null },
      });
      return {
        success: true,
        data: { outcome: "RESTORED", message: "Student membership restored." },
      };
    });
  } catch (error) {
    if (isUniqueError(error)) return uniqueMembershipError(assignmentId, studentUserId);
    if (isPublishedLockError(error)) {
      return { success: false, error: mutabilityMessages.PUBLISHED_EVALUATION_LOCK };
    }
    return unexpectedRosterFailure("restore_membership", actorId, assignmentId, error);
  }
}

export async function removeRosterMembership(
  assignmentId: string,
  membershipId: string,
  programId?: string
): Promise<RosterServiceResult<CourseRosterMutation>> {
  let actorId: string | undefined;
  try {
    const session = await resolveAuthSession();
    if (!session) return { success: false, error: "Authentication required." };
    actorId = session.userId;
    const authorization = await authorizeForWrite(assignmentId, programId);
    if (!authorization.success) return authorization;

    return await prisma.$transaction(async (tx) => {
      const assignment = await lockAssignment(tx, assignmentId);
      if (!assignment) return { success: false, error: NOT_FOUND_ERROR };
      const authorization = await confirmWriteAuthorization(tx, session, assignment, programId);
      if (authorization === false || !authorization.allowed) {
        return { success: false, error: NOT_FOUND_ERROR };
      }
      const lifecycleFailure = safeMutabilityFailure(assignment);
      if (lifecycleFailure) return lifecycleFailure;

      const membership = await tx.courseAssignmentMembership.findUnique({
        where: { id: membershipId },
        select: { id: true, course_assignment_id: true, is_active: true },
      });
      if (!membership || membership.course_assignment_id !== assignment.id) {
        return { success: false, error: "Roster membership not found." };
      }
      if (!membership.is_active)
        return { success: false, error: "Student membership is already removed." };

      await tx.courseAssignmentMembership.update({
        where: { id: membership.id },
        data: {
          is_active: false,
          updated_by: session.userId,
          removed_by: session.userId,
          removed_at: new Date(),
        },
      });
      return {
        success: true,
        data: { outcome: "REMOVED", message: "Student removed from Course roster." },
      };
    });
  } catch (error) {
    if (isPublishedLockError(error)) {
      return { success: false, error: mutabilityMessages.PUBLISHED_EVALUATION_LOCK };
    }
    return unexpectedRosterFailure("remove_membership", actorId, assignmentId, error);
  }
}
