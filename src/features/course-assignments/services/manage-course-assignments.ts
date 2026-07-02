import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import type { SystemRole } from "@prisma/client";
import { canManageCourseAssignment } from "../policies";
import type {
  CreateCourseAssignmentInput,
  UpdateCourseAssignmentInput,
  CourseAssignmentResult,
  BulkCreateResult,
  DeleteCourseAssignmentInput,
  ActivateCourseAssignmentInput,
} from "../types";

/**
 * Resolve the list of program IDs a Program Head is actively assigned to.
 * Returns an empty array for non-PH roles (admin/dean bypass scope checks in the policy).
 */
async function resolvePHProgramScope(
  session: Awaited<ReturnType<typeof resolveAuthSession>>
): Promise<string[]> {
  if (
    !session ||
    !session.roles.includes(ROLES.PROGRAM_HEAD) ||
    session.roles.includes(ROLES.SECRETARY) ||
    session.roles.includes(ROLES.DEAN)
  ) {
    return [];
  }

  const rows = await prisma.programHeadAssignment.findMany({
    where: { program_head_id: session.userId, is_active: true },
    select: { program_id: true },
  });

  return [...new Set(rows.map((r) => r.program_id))];
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
      return { success: false, error: "An identical assignment already exists. If inactive, please activate it instead of creating a new one." };
    }
    return { success: false, error: "Failed to create course assignment." };
  }
}

/**
 * Update an existing course assignment.
 */
export async function updateCourseAssignment(
  input: UpdateCourseAssignmentInput
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

  if (
    input.programId &&
    existing.course.program_id !== null &&
    input.programId !== existing.course.program_id
  ) {
    return { success: false, error: "Assignment program must match the Course's owning program." };
  }

  // Resolve PH program scope and check permissions
  const phProgramScope = await resolvePHProgramScope(authSession);
  const permission = canManageCourseAssignment(authSession, existing.course.program_id, phProgramScope);
  if (!permission.allowed) {
    return { success: false, error: permission.reason };
  }

  try {
    await prisma.courseAssignment.update({
      where: { id: input.assignmentId },
      data: {
        ...(input.programId && { program_id: input.programId }),
        ...(input.yearLevel && { year_level: input.yearLevel }),
        ...(input.section && { section: input.section }),
      },
    });

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update course assignment." };
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
  const permission = canManageCourseAssignment(authSession, existing.course.program_id, phProgramScope);
  if (!permission.allowed) {
    return { success: false, error: permission.reason };
  }

  try {
    await prisma.courseAssignment.update({
      where: { id: assignmentId },
      data: { is_active: false },
    });

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to deactivate course assignment." };
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
  const permission = canManageCourseAssignment(authSession, existing.course.program_id, phProgramScope);
  if (!permission.allowed) {
    return { success: false, error: permission.reason };
  }

  try {
    await prisma.courseAssignment.update({
      where: { id: input.assignmentId },
      data: { is_active: true },
    });

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to activate course assignment." };
  }
}

/**
 * Delete a course assignment (hard delete).
 * Blocked if course-bound evaluations exist for this assignment.
 */
export async function deleteCourseAssignment(
  input: DeleteCourseAssignmentInput
): Promise<CourseAssignmentResult> {
  const authSession = await resolveAuthSession();

  // Get existing assignment with related evaluations
  const existing = await prisma.courseAssignment.findUnique({
    where: { id: input.assignmentId },
    include: { 
      course: true,
      course_bound_evaluations: true,
    },
  });

  if (!existing) {
    return { success: false, error: "Assignment not found." };
  }

  // Resolve PH program scope and check permissions
  const phProgramScope = await resolvePHProgramScope(authSession);
  const permission = canManageCourseAssignment(authSession, existing.course.program_id, phProgramScope);
  if (!permission.allowed) {
    return { success: false, error: permission.reason };
  }

  // Check if assignment has related course-bound evaluations
  if (existing.course_bound_evaluations.length > 0) {
    return { 
      success: false, 
      error: "Cannot delete assignment because it has published course-bound evaluations. Please deactivate instead." 
    };
  }

  try {
    await prisma.courseAssignment.delete({
      where: { id: input.assignmentId },
    });

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete course assignment." };
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
  if (!authSession?.roles?.some((r) => allowedRoles.includes(r))) {
    return { success: false, created: 0, errors: [{ index: -1, error: "Insufficient permissions." }] };
  }

  // Resolve PH program scope once for the entire bulk operation
  const phProgramScope = await resolvePHProgramScope(authSession);

  const errors: Array<{ index: number; error: string }> = [];
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
        errors.push({ index: i, error: "Assignment program must match the Course's owning program." });
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
        errors.push({ index: i, error: "An identical assignment already exists. If inactive, please activate it instead of creating a new one." });
      } else {
        errors.push({ index: i, error: "Failed to create assignment." });
      }
    }
  }

  return { success: created > 0, created, errors };
}
