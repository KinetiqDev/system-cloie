import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { Prisma, type SystemRole } from "@prisma/client";
import { canManageCourseAssignment } from "../policies";
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
} from "../types";

/**
 * Resolve the list of program IDs a Program Head is actively assigned to.
 * Returns an empty array for non-PH roles (admin/dean bypass scope checks in the policy).
 */
async function resolvePHProgramScope(
  session: Awaited<ReturnType<typeof resolveAuthSession>>
): Promise<string[]> {
  return resolvePHProgramScopeWithDb(prisma, session);
}

async function resolvePHProgramScopeWithDb(
  db: typeof prisma | Prisma.TransactionClient,
  session: Awaited<ReturnType<typeof resolveAuthSession>>
): Promise<string[]> {
  if (!session || session.activeRole !== ROLES.PROGRAM_HEAD) {
    return [];
  }

  const rows = await db.programHeadAssignment.findMany({
    where: { program_head_id: session.userId, is_active: true },
    select: { program_id: true },
  });

  return [...new Set(rows.map((r) => r.program_id))];
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

/**
 * Create a new course assignment.
 */
export async function createCourseAssignment(
  input: CreateCourseAssignmentInput
): Promise<CourseAssignmentResult<{ id: string }>> {
  const authSession = await resolveAuthSession();

  // Get course program for scope check
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: { program_id: true },
  });

  if (!course) {
    return { success: false, error: "Course not found." };
  }

  if (course.program_id !== null && course.program_id !== input.programId) {
    return { success: false, error: "Assignment program must match the Course's owning program." };
  }

  // Resolve PH program scope and check permissions
  const phProgramScope = await resolvePHProgramScope(authSession);
  const permission = canManageCourseAssignment(authSession, course.program_id, phProgramScope);
  if (!permission.allowed) {
    return { success: false, error: permission.reason };
  }

  try {
    const assignment = await prisma.courseAssignment.create({
      data: {
        term_instance_id: input.termInstanceId,
        faculty_id: input.facultyId,
        course_id: input.courseId,
        program_id: input.programId,
        year_level: input.yearLevel,
        section: input.section,
        is_active: true,
        ...(authSession?.userId ? { assigned_by: authSession.userId } : {}),
      },
    });

    return { success: true, data: { id: assignment.id } };
  } catch (error) {
    // Handle unique constraint violation (database enforces uniqueness)
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return {
        success: false,
        error:
          "An identical assignment already exists. If inactive, please activate it instead of creating a new one.",
      };
    }
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
): Promise<CourseAssignmentResult> {
  const authSession = await resolveAuthSession();
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

      const phProgramScope = await resolvePHProgramScopeWithDb(tx, authSession);
      const permission = canManageCourseAssignment(
        authSession,
        existing.course.program_id,
        phProgramScope
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

      return { success: true, data: undefined };
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
  assignmentId: string
): Promise<CourseAssignmentResult> {
  const authSession = await resolveAuthSession();

  // Get existing assignment
  const existing = await prisma.courseAssignment.findUnique({
    where: { id: assignmentId },
    include: { course: true },
  });

  if (!existing) {
    return { success: false, error: "Assignment not found." };
  }

  // Resolve PH program scope and check permissions
  const phProgramScope = await resolvePHProgramScope(authSession);
  const permission = canManageCourseAssignment(
    authSession,
    existing.course.program_id,
    phProgramScope
  );
  if (!permission.allowed) {
    return { success: false, error: permission.reason };
  }

  try {
    await prisma.courseAssignment.update({
      where: { id: assignmentId },
      data: { is_active: false },
    });

    return { success: true, data: undefined };
  } catch (error) {
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
): Promise<CourseAssignmentResult> {
  const authSession = await resolveAuthSession();

  // Get existing assignment
  const existing = await prisma.courseAssignment.findUnique({
    where: { id: input.assignmentId },
    include: { course: true },
  });

  if (!existing) {
    return { success: false, error: "Assignment not found." };
  }

  // Resolve PH program scope and check permissions
  const phProgramScope = await resolvePHProgramScope(authSession);
  const permission = canManageCourseAssignment(
    authSession,
    existing.course.program_id,
    phProgramScope
  );
  if (!permission.allowed) {
    return { success: false, error: permission.reason };
  }

  try {
    await prisma.courseAssignment.update({
      where: { id: input.assignmentId },
      data: { is_active: true },
    });

    return { success: true, data: undefined };
  } catch (error) {
    return unexpectedLifecycleFailure(
      "activate_assignment",
      authSession?.userId,
      input.assignmentId,
      error
    );
  }
}

export async function preflightCourseAssignmentDeletion(
  assignmentId: string
): Promise<CourseAssignmentResult<CourseAssignmentDeletionPreflight>> {
  let actorId: string | undefined;
  try {
    const authSession = await resolveAuthSession();
    actorId = authSession?.userId;
    const existing = await resolveLifecycleAssignment(assignmentId);
    if (!existing) return { success: false, error: "Assignment not found." };

    const phProgramScope = await resolvePHProgramScope(authSession);
    const permission = canManageCourseAssignment(
      authSession,
      existing.course.program_id,
      phProgramScope
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
): Promise<CourseAssignmentResult> {
  const authSession = await resolveAuthSession();
  if (!authSession) return { success: false, error: "Authentication required." };

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

      const phProgramScope = await resolvePHProgramScopeWithDb(tx, authSession);
      const permission = canManageCourseAssignment(
        authSession,
        existing.course.program_id,
        phProgramScope
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
      return { success: true, data: undefined };
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
  inputs: CreateCourseAssignmentInput[]
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

  // Resolve PH program scope once for the entire bulk operation
  const phProgramScope = await resolvePHProgramScope(authSession);

  const errors: Array<{ index: number; error: string; referenceId?: string }> = [];
  let created = 0;

  // Process each assignment in a transaction
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];

    try {
      // Get course program for scope check
      const course = await prisma.course.findUnique({
        where: { id: input.courseId },
        select: { program_id: true },
      });

      if (!course) {
        errors.push({ index: i, error: "Course not found." });
        continue;
      }

      if (course.program_id !== null && course.program_id !== input.programId) {
        errors.push({
          index: i,
          error: "Assignment program must match the Course's owning program.",
        });
        continue;
      }

      // Check permissions
      const permission = canManageCourseAssignment(authSession, course.program_id, phProgramScope);
      if (!permission.allowed) {
        errors.push({ index: i, error: permission.reason });
        continue;
      }

      await prisma.courseAssignment.create({
        data: {
          term_instance_id: input.termInstanceId,
          faculty_id: input.facultyId,
          course_id: input.courseId,
          program_id: input.programId,
          year_level: input.yearLevel,
          section: input.section,
          is_active: true,
          ...(authSession?.userId ? { assigned_by: authSession.userId } : {}),
        },
      });

      created++;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        errors.push({
          index: i,
          error:
            "An identical assignment already exists. If inactive, please activate it instead of creating a new one.",
        });
      } else {
        const failure = unexpectedLifecycleFailure(
          "bulk_create_assignment",
          authSession?.userId,
          input.courseId,
          error
        );
        errors.push({ index: i, error: failure.error, referenceId: failure.referenceId });
      }
    }
  }

  return { success: created > 0, created, errors };
}
