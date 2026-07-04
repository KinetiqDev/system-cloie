"use server";

import { revalidatePath } from "next/cache";
import {
  createCourseAssignmentSchema,
  updateCourseAssignmentSchema,
  deactivateCourseAssignmentSchema,
  activateCourseAssignmentSchema,
  deleteCourseAssignmentSchema,
  bulkCreateCourseAssignmentsSchema,
} from "@/features/course-assignments/schemas/course-assignment";
import {
  createCourseAssignment,
  updateCourseAssignment,
  deactivateCourseAssignment,
  activateCourseAssignment,
  deleteCourseAssignment,
  bulkCreateCourseAssignments,
} from "@/features/course-assignments/services/manage-course-assignments";
import { listCourseAssignments } from "@/features/course-assignments/services/list-course-assignments";
import { listCourseAssignmentsForFaculty } from "@/features/course-assignments/services/list-course-assignments-for-faculty";
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
} from "@/features/course-assignments/types";

function revalidateCourseAssignmentRoutes() {
  revalidatePath("/program-head/course-assignments");
  revalidatePath("/secretary/course-assignments");
  revalidatePath("/dean/course-assignments");
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
 * List course assignments for the current role (Program Head scoped, Secretary/Dean unscoped).
 */
export async function listCourseAssignmentsAction(
  filter: ListCourseAssignmentsFilter,
  options?: ListOptions
) {
  return listCourseAssignments(filter, options);
}

/**
 * @deprecated Use listCourseAssignmentsAction instead. Kept for callers that haven't migrated.
 */
export async function listCourseAssignmentsForProgramHeadAction(
  filter: ListCourseAssignmentsFilter,
  options?: ListOptions
) {
  return listCourseAssignmentsAction(filter, options);
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
