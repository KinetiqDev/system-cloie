import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { Prisma, type SystemRole } from "@prisma/client";
import { canManageCourseAssignment } from "../policies";
import {
  resolveProgramHeadContext,
  revalidateProgramHeadAssignment,
} from "@/features/auth/services/resolve-program-head-context";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { getSectionLabel } from "@/lib/constants/academic";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import type {
  CreateCourseAssignmentInput,
  UpdateCourseAssignmentInput,
  CourseAssignmentResult,
  BulkCreateResult,
  DeleteCourseAssignmentInput,
  ActivateCourseAssignmentInput,
  CourseAssignmentDeletionPreflight,
  CourseAssignmentMutationData,
} from "../types";

function isProgramHead(session: Awaited<ReturnType<typeof resolveAuthSession>>) {
  return session?.activeRole === ROLES.PROGRAM_HEAD;
}

function missingSelectedProgram() {
  return { success: false as const, error: "Selected Program is required." };
}

async function validateSelectedProgram(
  session: Awaited<ReturnType<typeof resolveAuthSession>>,
  programId: string | undefined
) {
  if (!session || !isProgramHead(session)) return null;
  if (!programId) return missingSelectedProgram();
  const result = await resolveProgramHeadContext(programId);
  return result.success ? null : result;
}

type AssignmentLifecycleRow = {
  id: string;
  faculty_id: string;
  course_id: string;
  program_id: string;
  term_instance_id: string;
  year_level: Parameters<typeof getYearLevelDisplay>[0];
  section: Parameters<typeof getSectionLabel>[0];
  is_active: boolean;
  updated_at: Date;
  course: { code: string; title: string; program_id: string | null };
  program: { code: string; name: string };
  term_instance: {
    semester: Parameters<typeof formatTermInstanceLabel>[1];
    term: Parameters<typeof formatTermInstanceLabel>[2];
    school_year: { code: string };
  };
  _count: { memberships: number; course_bound_evaluations: number };
};

function assignmentLabel(
  assignment: Pick<
    AssignmentLifecycleRow,
    "course" | "program" | "year_level" | "section" | "term_instance"
  >
) {
  return [
    `${assignment.course.code} — ${assignment.course.title}`,
    assignment.program.code,
    getYearLevelDisplay(assignment.year_level),
    getSectionLabel(assignment.section),
    formatTermInstanceLabel(
      assignment.term_instance.school_year.code,
      assignment.term_instance.semester,
      assignment.term_instance.term
    ),
  ].join(" · ");
}

const lifecycleAssignmentInclude = {
  course: { select: { code: true, title: true, program_id: true } },
  program: { select: { code: true, name: true } },
  term_instance: {
    select: { semester: true, term: true, school_year: { select: { code: true } } },
  },
  _count: { select: { memberships: true, course_bound_evaluations: true } },
} as const;

async function resolveLifecycleAssignment(assignmentId: string) {
  return prisma.courseAssignment.findUnique({
    where: { id: assignmentId },
    include: lifecycleAssignmentInclude,
  });
}

function unexpectedLifecycleFailure(
  operation: string,
  actorId: string | undefined,
  assignmentId: string,
  error: unknown
) {
  const referenceId = randomUUID();
  console.error("Course assignment lifecycle request failed", {
    operation,
    actorId: actorId ?? null,
    assignmentId,
    referenceId,
    error: error instanceof Error ? { name: error.name } : { type: typeof error },
  });
  return {
    success: false as const,
    error: "The course assignment request could not be completed.",
    referenceId,
  };
}

async function resolveCurriculumCourseForAssignment(
  tx: Prisma.TransactionClient,
  curriculumCourseId: string | null | undefined,
  courseId: string,
  programId: string
) {
  if (!curriculumCourseId) return null;

  await tx.$queryRaw`
    SELECT id
    FROM "curriculum_versions"
    WHERE id = (
      SELECT curriculum_version_id
      FROM "curriculum_courses"
      WHERE id = ${curriculumCourseId}
    )
    FOR UPDATE
  `;

  const curriculumCourse = await tx.curriculumCourse.findUnique({
    where: { id: curriculumCourseId },
    select: {
      course_id: true,
      year_level: true,
      course: { select: { is_active: true } },
      curriculum_version: { select: { program_id: true, status: true } },
    },
  });

  if (!curriculumCourse) throw new Error("CURRICULUM_COURSE_NOT_FOUND");
  if (curriculumCourse.course_id !== courseId) {
    throw new Error("CURRICULUM_COURSE_MISMATCH");
  }
  if (!curriculumCourse.course.is_active) {
    throw new Error("COURSE_INACTIVE");
  }
  if (curriculumCourse.curriculum_version.status !== "PUBLISHED") {
    throw new Error("CURRICULUM_COURSE_NOT_PUBLISHED");
  }
  if (curriculumCourse.curriculum_version.program_id !== programId) {
    throw new Error("CURRICULUM_PROGRAM_MISMATCH");
  }

  return curriculumCourse;
}

async function resolveAssignmentCourse(
  tx: Prisma.TransactionClient,
  input: CreateCourseAssignmentInput
) {
  const course = await tx.course.findUnique({
    where: { id: input.courseId },
    select: { program_id: true, is_active: true },
  });
  if (!course) throw new Error("COURSE_NOT_FOUND");
  if (course.is_active === false) throw new Error("COURSE_INACTIVE");
  if (course.program_id !== null && course.program_id !== input.programId) {
    throw new Error("COURSE_PROGRAM_MISMATCH");
  }

  const curriculumCourse = await resolveCurriculumCourseForAssignment(
    tx,
    input.curriculumCourseId,
    input.courseId,
    input.programId
  );
  const yearLevel = input.yearLevel ?? curriculumCourse?.year_level;
  if (!yearLevel) throw new Error("YEAR_LEVEL_REQUIRED");

  return { course, yearLevel };
}

function assignmentCreationError(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
    return "An identical assignment already exists. If inactive, please activate it instead of creating a new one.";
  }
  if (error instanceof Error) {
    const errors: Record<string, string> = {
      COURSE_NOT_FOUND: "Course not found.",
      COURSE_PROGRAM_MISMATCH: "Assignment program must match the Course's owning program.",
      CURRICULUM_COURSE_NOT_FOUND: "Selected curriculum course was not found.",
      CURRICULUM_COURSE_MISMATCH: "Selected curriculum course does not match the assigned course",
      CURRICULUM_COURSE_NOT_PUBLISHED:
        "Only published curriculum courses can be linked to new assignments.",
      COURSE_INACTIVE: "Inactive courses cannot receive new assignments.",
      CURRICULUM_PROGRAM_MISMATCH:
        "Selected curriculum course does not belong to the assignment program.",
      YEAR_LEVEL_REQUIRED: "Year level is required.",
      SELECTED_PROGRAM_INACTIVE: "Selected Program is no longer assigned.",
    };
    if (error.message.startsWith("PERMISSION:")) return error.message.slice("PERMISSION:".length);
    return errors[error.message] ?? null;
  }

  return null;
}

/**
 * Create a new course assignment.
 */
export async function createCourseAssignment(
  input: CreateCourseAssignmentInput
): Promise<CourseAssignmentResult<{ id: string; programIds: string[] }>> {
  const authSession = await resolveAuthSession();

  if (isProgramHead(authSession) && input.selectedProgramId !== input.programId) {
    return missingSelectedProgram();
  }
  const contextFailure = await validateSelectedProgram(authSession, input.selectedProgramId);
  if (contextFailure) return contextFailure;

  try {
    const assignment = await prisma.$transaction(async (tx) => {
      if (authSession && isProgramHead(authSession)) {
        const selected = await revalidateProgramHeadAssignment(tx, {
          userId: authSession.userId,
          programId: input.programId,
        });
        if (!selected) throw new Error("SELECTED_PROGRAM_INACTIVE");
      }

      const { course, yearLevel } = await resolveAssignmentCourse(tx, input);
      const permission = canManageCourseAssignment(
        authSession,
        course.program_id,
        authSession && isProgramHead(authSession) ? [input.programId] : []
      );
      if (!permission.allowed) throw new Error(`PERMISSION:${permission.reason}`);

      return tx.courseAssignment.create({
        data: {
          term_instance_id: input.termInstanceId,
          faculty_id: input.facultyId,
          course_id: input.courseId,
          program_id: input.programId,
          year_level: yearLevel,
          section: input.section,
          ...(input.curriculumCourseId ? { curriculum_course_id: input.curriculumCourseId } : {}),
          is_active: true,
          ...(authSession?.userId ? { assigned_by: authSession.userId } : {}),
        },
      });
    });

    return { success: true, data: { id: assignment.id, programIds: [input.programId] } };
  } catch (error) {
    const knownError = assignmentCreationError(error);
    if (knownError) return { success: false, error: knownError };
    return unexpectedLifecycleFailure(
      "create_assignment",
      authSession?.userId,
      input.courseId,
      error
    );
  }
}

/**
 * Update an existing course assignment.
 */
export async function updateCourseAssignment(
  input: UpdateCourseAssignmentInput
): Promise<CourseAssignmentResult<CourseAssignmentMutationData | undefined>> {
  const authSession = await resolveAuthSession();
  if (!authSession) return { success: false, error: "Authentication required." };
  const contextFailure = await validateSelectedProgram(authSession, input.selectedProgramId);
  if (contextFailure) return contextFailure;
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "course_assignments"
        WHERE id = ${input.assignmentId}
        FOR UPDATE
      `;

      const existing = await tx.courseAssignment.findUnique({
        where: { id: input.assignmentId },
        include: { course: true },
      });

      if (!existing) return { success: false, error: "Assignment not found." };

      if (isProgramHead(authSession)) {
        if (!input.selectedProgramId) return missingSelectedProgram();
        const selected = await revalidateProgramHeadAssignment(tx, {
          userId: authSession.userId,
          programId: input.selectedProgramId,
        });
        if (!selected || existing.program_id !== input.selectedProgramId) {
          return { success: false, error: "Course assignment is outside the selected Program." };
        }
        if (input.programId !== undefined && input.programId !== input.selectedProgramId) {
          return { success: false, error: "Course assignment is outside the selected Program." };
        }
      }

      if (
        input.programId !== undefined &&
        existing.course.program_id !== null &&
        input.programId !== existing.course.program_id
      ) {
        return {
          success: false,
          error: "Assignment program must match the Course's owning program.",
        };
      }

      const permission = canManageCourseAssignment(
        authSession,
        existing.course.program_id,
        isProgramHead(authSession) && input.selectedProgramId ? [input.selectedProgramId] : []
      );
      if (!permission.allowed) return { success: false, error: permission.reason };

      const membershipCount = await tx.courseAssignmentMembership.count({
        where: { course_assignment_id: input.assignmentId },
      });
      if (
        membershipCount > 0 &&
        ((input.programId !== undefined && input.programId !== existing.program_id) ||
          (input.yearLevel !== undefined && input.yearLevel !== existing.year_level) ||
          (input.section !== undefined && input.section !== existing.section))
      ) {
        return {
          success: false,
          error:
            "Course, academic period, program, year level, and section cannot change after roster membership exists.",
        };
      }

      if (input.facultyId !== undefined && input.facultyId !== existing.faculty_id) {
        const faculty = await tx.user.findFirst({
          where: {
            id: input.facultyId,
            is_active: true,
            roles: { some: { role: ROLES.FACULTY } },
          },
          select: { id: true },
        });
        if (!faculty) {
          return { success: false, error: "Selected Faculty account is not available." };
        }
      }

      await tx.courseAssignment.update({
        where: { id: input.assignmentId },
        data: {
          ...(input.programId !== undefined && { program_id: input.programId }),
          ...(input.yearLevel !== undefined && { year_level: input.yearLevel }),
          ...(input.section !== undefined && { section: input.section }),
          ...(input.facultyId !== undefined && { faculty_id: input.facultyId }),
        },
      });

      return {
        success: true,
        data: {
          programIds: [
            ...new Set(
              [existing.program_id, input.programId].filter((id): id is string => Boolean(id))
            ),
          ],
        },
      };
    });
  } catch (error) {
    return unexpectedLifecycleFailure(
      "update_assignment",
      authSession?.userId,
      input.assignmentId,
      error
    );
  }
}

/**
 * Deactivate a course assignment (soft delete).
 */
export async function deactivateCourseAssignment(
  input: string | { assignmentId: string; programId?: string }
): Promise<CourseAssignmentResult<CourseAssignmentMutationData | undefined>> {
  const authSession = await resolveAuthSession();
  const assignmentId = typeof input === "string" ? input : input.assignmentId;
  const selectedProgramId = typeof input === "string" ? undefined : input.programId;
  const contextFailure = await validateSelectedProgram(authSession, selectedProgramId);
  if (contextFailure) return contextFailure;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.courseAssignment.findUnique({
        where: { id: assignmentId },
        include: { course: true },
      });
      if (!existing) throw new Error("ASSIGNMENT_NOT_FOUND");
      if (authSession && isProgramHead(authSession)) {
        if (!selectedProgramId) throw new Error("SELECTED_PROGRAM_REQUIRED");
        const selected = await revalidateProgramHeadAssignment(tx, {
          userId: authSession.userId,
          programId: selectedProgramId,
        });
        if (!selected || existing.program_id !== selectedProgramId) throw new Error("OUT_OF_SCOPE");
      }
      const permission = canManageCourseAssignment(
        authSession,
        existing.course.program_id,
        authSession && isProgramHead(authSession) && selectedProgramId ? [selectedProgramId] : []
      );
      if (!permission.allowed) throw new Error(`PERMISSION:${permission.reason}`);
      await tx.courseAssignment.update({ where: { id: assignmentId }, data: { is_active: false } });
      return { programIds: [existing.program_id] };
    });

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ASSIGNMENT_NOT_FOUND")
        return { success: false, error: "Assignment not found." };
      if (error.message === "SELECTED_PROGRAM_REQUIRED") return missingSelectedProgram();
      if (error.message === "OUT_OF_SCOPE")
        return { success: false, error: "Course assignment is outside the selected Program." };
      if (error.message.startsWith("PERMISSION:"))
        return { success: false, error: error.message.slice(11) };
    }
    return unexpectedLifecycleFailure(
      "deactivate_assignment",
      authSession?.userId,
      assignmentId,
      error
    );
  }
}

/**
 * Activate a course assignment (re-enable soft deleted).
 */
export async function activateCourseAssignment(
  input: ActivateCourseAssignmentInput
): Promise<CourseAssignmentResult<CourseAssignmentMutationData | undefined>> {
  const authSession = await resolveAuthSession();
  const contextFailure = await validateSelectedProgram(authSession, input.programId);
  if (contextFailure) return contextFailure;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.courseAssignment.findUnique({
        where: { id: input.assignmentId },
        include: { course: true },
      });
      if (!existing) throw new Error("ASSIGNMENT_NOT_FOUND");
      if (authSession && isProgramHead(authSession)) {
        if (!input.programId) throw new Error("SELECTED_PROGRAM_REQUIRED");
        const selected = await revalidateProgramHeadAssignment(tx, {
          userId: authSession.userId,
          programId: input.programId,
        });
        if (!selected || existing.program_id !== input.programId) throw new Error("OUT_OF_SCOPE");
      }
      const permission = canManageCourseAssignment(
        authSession,
        existing.course.program_id,
        authSession && isProgramHead(authSession) && input.programId ? [input.programId] : []
      );
      if (!permission.allowed) throw new Error(`PERMISSION:${permission.reason}`);
      await tx.courseAssignment.update({
        where: { id: input.assignmentId },
        data: { is_active: true },
      });
      return { programIds: [existing.program_id] };
    });

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ASSIGNMENT_NOT_FOUND")
        return { success: false, error: "Assignment not found." };
      if (error.message === "SELECTED_PROGRAM_REQUIRED") return missingSelectedProgram();
      if (error.message === "OUT_OF_SCOPE")
        return { success: false, error: "Course assignment is outside the selected Program." };
      if (error.message.startsWith("PERMISSION:"))
        return { success: false, error: error.message.slice(11) };
    }
    return unexpectedLifecycleFailure(
      "activate_assignment",
      authSession?.userId,
      input.assignmentId,
      error
    );
  }
}

export async function preflightCourseAssignmentDeletion(
  input: string | { assignmentId: string; programId?: string }
): Promise<CourseAssignmentResult<CourseAssignmentDeletionPreflight>> {
  const assignmentId = typeof input === "string" ? input : input.assignmentId;
  const selectedProgramId = typeof input === "string" ? undefined : input.programId;
  let actorId: string | undefined;
  try {
    const authSession = await resolveAuthSession();
    actorId = authSession?.userId;
    const contextFailure = await validateSelectedProgram(authSession, selectedProgramId);
    if (contextFailure) return contextFailure;
    const existing = await resolveLifecycleAssignment(assignmentId);
    if (!existing) return { success: false, error: "Assignment not found." };

    if (authSession && isProgramHead(authSession)) {
      if (!selectedProgramId) return missingSelectedProgram();
      const context = await resolveProgramHeadContext(selectedProgramId);
      if (
        !context.success ||
        context.data.userId !== authSession?.userId ||
        existing.program_id !== selectedProgramId
      ) {
        return { success: false, error: "Course assignment is outside the selected Program." };
      }
    }
    const permission = canManageCourseAssignment(
      authSession,
      existing.course.program_id,
      authSession && isProgramHead(authSession) && selectedProgramId ? [selectedProgramId] : []
    );
    if (!permission.allowed) return { success: false, error: permission.reason };

    const [activeMembershipCount, removedMembershipCount] = await Promise.all([
      prisma.courseAssignmentMembership.count({
        where: { course_assignment_id: assignmentId, is_active: true },
      }),
      prisma.courseAssignmentMembership.count({
        where: { course_assignment_id: assignmentId, is_active: false },
      }),
    ]);

    return {
      success: true,
      data: {
        id: existing.id,
        label: assignmentLabel(existing),
        revision: existing.updated_at.toISOString(),
        membershipCount: existing._count.memberships,
        activeMembershipCount,
        removedMembershipCount,
        courseBoundEvaluationCount: existing._count.course_bound_evaluations,
      },
    };
  } catch (error) {
    return unexpectedLifecycleFailure("preflight_delete_assignment", actorId, assignmentId, error);
  }
}

/**
 * Permanently delete an assignment only after rechecking every destructive-flow guard in one transaction.
 */
export async function deleteCourseAssignment(
  input: DeleteCourseAssignmentInput
): Promise<CourseAssignmentResult<CourseAssignmentMutationData | undefined>> {
  const authSession = await resolveAuthSession();
  if (!authSession) return { success: false, error: "Authentication required." };
  const contextFailure = await validateSelectedProgram(authSession, input.programId);
  if (contextFailure) return contextFailure;

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "course_assignments"
        WHERE id = ${input.assignmentId}
        FOR UPDATE
      `;

      const existing = await tx.courseAssignment.findUnique({
        where: { id: input.assignmentId },
        include: lifecycleAssignmentInclude,
      });
      if (!existing) return { success: false, error: "Assignment not found." };

      if (isProgramHead(authSession)) {
        if (!input.programId) return missingSelectedProgram();
        const selected = await revalidateProgramHeadAssignment(tx, {
          userId: authSession.userId,
          programId: input.programId,
        });
        if (!selected || existing.program_id !== input.programId) {
          return { success: false, error: "Course assignment is outside the selected Program." };
        }
      }
      const permission = canManageCourseAssignment(
        authSession,
        existing.course.program_id,
        isProgramHead(authSession) && input.programId ? [input.programId] : []
      );
      if (!permission.allowed) return { success: false, error: permission.reason };

      const currentLabel = assignmentLabel(existing);
      if (input.confirmationLabel !== currentLabel) {
        return { success: false, error: "Course assignment label confirmation does not match." };
      }
      if (input.revision !== existing.updated_at.toISOString()) {
        return { success: false, error: "Course assignment changed after deletion preflight." };
      }
      const currentMembershipCount = await tx.courseAssignmentMembership.count({
        where: { course_assignment_id: input.assignmentId },
      });
      const [currentActiveMembershipCount, currentRemovedMembershipCount] = await Promise.all([
        tx.courseAssignmentMembership.count({
          where: { course_assignment_id: input.assignmentId, is_active: true },
        }),
        tx.courseAssignmentMembership.count({
          where: { course_assignment_id: input.assignmentId, is_active: false },
        }),
      ]);
      if (
        input.membershipCount !== currentMembershipCount ||
        currentMembershipCount !== existing._count.memberships ||
        input.activeMembershipCount !== currentActiveMembershipCount ||
        input.removedMembershipCount !== currentRemovedMembershipCount
      ) {
        return {
          success: false,
          error: "Course assignment roster changed after deletion preflight.",
        };
      }
      if (existing._count.course_bound_evaluations > 0) {
        return {
          success: false,
          error:
            "Cannot permanently delete this Course assignment because a Course-bound evaluation exists. Deactivate it instead.",
        };
      }

      await tx.courseAssignment.delete({ where: { id: input.assignmentId } });
      return { success: true, data: { programIds: [existing.program_id] } };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return {
        success: false,
        error:
          "Cannot permanently delete this Course assignment because a Course-bound evaluation exists. Deactivate it instead.",
      };
    }
    return unexpectedLifecycleFailure(
      "delete_assignment",
      authSession.userId,
      input.assignmentId,
      error
    );
  }
}

/**
 * Bulk create course assignments with per-row error reporting.
 *
 * DESIGN: Partial Success Behavior
 * - Each assignment is created independently
 * - Successful creations persist even if some items fail
 * - Returns detailed per-item error reporting
 * - Caller receives: { success: boolean, created: number, errors: [...] }
 * - success=true when AT LEAST ONE item was created; success=false means a total failure
 *
 * This design prioritizes user experience: users don't lose progress on
 * successful items when one item in the batch has an issue.
 */
export async function bulkCreateCourseAssignments(
  inputs: CreateCourseAssignmentInput[],
  selectedProgramId?: string
): Promise<BulkCreateResult> {
  const authSession = await resolveAuthSession();

  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN, ROLES.PROGRAM_HEAD];
  if (!authSession?.activeRole || !allowedRoles.includes(authSession.activeRole)) {
    return {
      success: false,
      created: 0,
      errors: [{ index: -1, error: "Insufficient permissions." }],
    };
  }

  const contextFailure = await validateSelectedProgram(authSession, selectedProgramId);
  if (contextFailure) {
    return { success: false, created: 0, errors: [{ index: -1, error: contextFailure.error }] };
  }

  const errors: Array<{ index: number; error: string; referenceId?: string }> = [];
  let created = 0;

  // Process each assignment in a transaction
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];

    try {
      const requestedProgramId = selectedProgramId ?? input.selectedProgramId;
      if (isProgramHead(authSession) && requestedProgramId !== input.programId) {
        errors.push({ index: i, error: "Course assignment is outside the selected Program." });
        continue;
      }

      if (!requestedProgramId && isProgramHead(authSession)) {
        errors.push({ index: i, error: "Selected Program is required." });
        continue;
      }

      await prisma.$transaction(async (tx) => {
        if (isProgramHead(authSession)) {
          const selected = await revalidateProgramHeadAssignment(tx, {
            userId: authSession.userId,
            programId: requestedProgramId ?? input.programId,
          });
          if (!selected) throw new Error("SELECTED_PROGRAM_INACTIVE");
        }
        const { course, yearLevel } = await resolveAssignmentCourse(tx, input);
        const permission = canManageCourseAssignment(
          authSession,
          course.program_id,
          isProgramHead(authSession) ? [input.programId] : []
        );
        if (!permission.allowed) throw new Error(`PERMISSION:${permission.reason}`);
        await tx.courseAssignment.create({
          data: {
            term_instance_id: input.termInstanceId,
            faculty_id: input.facultyId,
            course_id: input.courseId,
            program_id: input.programId,
            year_level: yearLevel,
            section: input.section,
            ...(input.curriculumCourseId ? { curriculum_course_id: input.curriculumCourseId } : {}),
            is_active: true,
            assigned_by: authSession.userId,
          },
        });
      });

      created++;
    } catch (error) {
      const knownError = assignmentCreationError(error);
      if (knownError) {
        errors.push({ index: i, error: knownError });
      } else {
        errors.push({
          index: i,
          error: unexpectedLifecycleFailure(
            "bulk_create_assignment",
            authSession?.userId,
            input.courseId,
            error
          ).error,
        });
      }
    }
  }

  return { success: created > 0, created, errors };
}
