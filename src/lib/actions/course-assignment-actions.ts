"use server";

import { revalidatePath } from "next/cache";
import {
  createCourseAssignmentSchema,
  updateCourseAssignmentSchema,
  deactivateCourseAssignmentSchema,
  activateCourseAssignmentSchema,
  deleteCourseAssignmentSchema,
  preflightCourseAssignmentDeletionSchema,
  bulkCreateCourseAssignmentsSchema,
} from "@/features/course-assignments/schemas/course-assignment";
import {
  createCourseAssignment,
  updateCourseAssignment,
  deactivateCourseAssignment,
  activateCourseAssignment,
  deleteCourseAssignment,
  preflightCourseAssignmentDeletion,
  bulkCreateCourseAssignments,
} from "@/features/course-assignments/services/manage-course-assignments";
import { listCourseAssignmentsForFaculty } from "@/features/course-assignments/services/list-course-assignments-for-faculty";
import { listCourseAssignments } from "@/features/course-assignments/services/list-course-assignments";
import { searchFacultyPool } from "@/features/course-assignments/services/search-faculty-pool";
import type {
  CreateCourseAssignmentInput,
  UpdateCourseAssignmentInput,
  DeactivateCourseAssignmentInput,
  ActivateCourseAssignmentInput,
  DeleteCourseAssignmentInput,
  BulkCreateCourseAssignmentsInput,
  ListCourseAssignmentsFilter,
  ListOptions,
  CourseAssignmentDeletionPreflight,
  CourseAssignmentResult,
} from "@/features/course-assignments/types";

function revalidateCourseAssignmentRoutes() {
  revalidatePath("/program-head/course-assignments");
  revalidatePath("/secretary/course-assignments");
  revalidatePath("/dean/academic-structure/course-assignments");
  revalidatePath("/faculty/course-rosters");
}

/**
 * Create a new course assignment.
 */
export async function createCourseAssignmentAction(input: CreateCourseAssignmentInput) {
  const parsed = createCourseAssignmentSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await createCourseAssignment(parsed.data);

  if (result.success) {
    revalidateCourseAssignmentRoutes();
  }

  return result;
}

/**
 * Update an existing course assignment.
 */
export async function updateCourseAssignmentAction(input: UpdateCourseAssignmentInput) {
  const parsed = updateCourseAssignmentSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await updateCourseAssignment(parsed.data);

  if (result.success) {
    revalidateCourseAssignmentRoutes();
  }

  return result;
}

/**
 * Deactivate a course assignment.
 */
export async function deactivateCourseAssignmentAction(input: DeactivateCourseAssignmentInput) {
  const parsed = deactivateCourseAssignmentSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await deactivateCourseAssignment(parsed.data.assignmentId);

  if (result.success) {
    revalidateCourseAssignmentRoutes();
  }

  return result;
}

/**
 * Activate a course assignment.
 */
export async function activateCourseAssignmentAction(input: ActivateCourseAssignmentInput) {
  const parsed = activateCourseAssignmentSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await activateCourseAssignment(parsed.data);

  if (result.success) {
    revalidateCourseAssignmentRoutes();
  }

  return result;
}

/**
 * Delete a course assignment (hard delete).
 */
export async function deleteCourseAssignmentAction(input: DeleteCourseAssignmentInput) {
  const parsed = deleteCourseAssignmentSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await deleteCourseAssignment(parsed.data);

  if (result.success) {
    revalidateCourseAssignmentRoutes();
  }

  return result;
}

/**
 * Load current server-owned facts for the destructive confirmation dialog.
 */
export async function preflightCourseAssignmentDeletionAction(
  assignmentId: string
): Promise<CourseAssignmentResult<CourseAssignmentDeletionPreflight>> {
  const parsed = preflightCourseAssignmentDeletionSchema.safeParse({ assignmentId });
  if (!parsed.success) return { success: false, error: "Invalid course assignment." };
  return preflightCourseAssignmentDeletion(parsed.data.assignmentId);
}

/**
 * Bulk create course assignments.
 */
export async function bulkCreateCourseAssignmentsAction(input: BulkCreateCourseAssignmentsInput) {
  const parsed = bulkCreateCourseAssignmentsSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, errors: [{ index: -1, error: "Invalid input" }], created: 0 };
  }

  const result = await bulkCreateCourseAssignments(parsed.data.assignments);

  if (result.success) {
    revalidateCourseAssignmentRoutes();
  }

  return result;
}

/**
 * Load assignments for the explicitly opened course-assignment sheet.
 * The role-owned list routes read their initial page in Server Components.
 */
export async function loadCourseAssignmentsForSheetAction(
  filter: ListCourseAssignmentsFilter,
  options?: ListOptions
) {
  return listCourseAssignments(filter, options);
}

/**
 * List course assignments for Faculty.
 */
export async function listCourseAssignmentsForFacultyAction(facultyId?: string) {
  return listCourseAssignmentsForFaculty(facultyId);
}

/**
 * Search faculty pool.
 */
export async function searchFacultyPoolAction(query: string, page?: number, pageSize?: number) {
  return searchFacultyPool(query, page, pageSize);
}
