"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
import { listPublishedCurriculumCourseOptions } from "@/features/curriculum/services/read-curriculum-pages";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { ROLES } from "@/lib/constants/roles";
import type { PublishedCurriculumCourseOption } from "@/features/curriculum/types";
import type { ServiceResult } from "@/lib/utils/service-result";
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
import { buildProgramHeadCourseAssignmentsPath } from "@/lib/constants/program-head-routes";
export type BulkCourseAssignmentLifecycleResult = {
  succeeded: string[];
  failed: Array<{ id: string; error: string; referenceId?: string }>;
};

function revalidateCourseAssignmentRoutes(programIds?: string | string[]) {
  for (const programId of programIds
    ? Array.isArray(programIds)
      ? programIds
      : [programIds]
    : []) {
    revalidatePath(buildProgramHeadCourseAssignmentsPath(programId));
  }
  revalidatePath("/secretary/course-assignments");
  revalidatePath("/dean/academic-structure/course-assignments");
  revalidatePath("/gen-ed-coordinator/course-assignments");
  revalidatePath("/faculty/course-rosters");
}

type CreateCourseAssignmentActionInput = CreateCourseAssignmentInput | FormData;

function formDataValue(formData: FormData, ...keys: string[]) {
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function normalizeCreateCourseAssignmentInput(input: CreateCourseAssignmentActionInput) {
  if (!(input instanceof FormData)) return input;

  return {
    termInstanceId: formDataValue(input, "termInstanceId", "term_instance_id"),
    facultyId: formDataValue(input, "facultyId", "faculty_id"),
    courseId: formDataValue(input, "courseId", "course_id"),
    programId: formDataValue(input, "programId", "program_id"),
    yearLevel: formDataValue(input, "yearLevel", "year_level"),
    section: formDataValue(input, "section"),
    curriculumCourseId: formDataValue(input, "curriculumCourseId", "curriculum_course_id"),
    selectedProgramId: formDataValue(input, "selectedProgramId", "selected_program_id"),
  };
}

/**
 * Create a new course assignment.
 */
export async function createCourseAssignmentAction(input: CreateCourseAssignmentActionInput) {
  const parsed = createCourseAssignmentSchema.safeParse(
    normalizeCreateCourseAssignmentInput(input)
  );

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await createCourseAssignment(parsed.data);

  if (result.success) {
    revalidateCourseAssignmentRoutes(result.data?.programIds ?? parsed.data.selectedProgramId);
  }

  return result;
}

const curriculumProgramIdSchema = z.string().uuid();

/**
 * Load published CurriculumCourses for the assignment picker. Dean access is
 * explicit here because curriculum authoring reads intentionally exclude Dean.
 */
export async function loadCurriculumCoursesForProgramAction(
  programId: string
): Promise<ServiceResult<PublishedCurriculumCourseOption[]>> {
  const parsed = curriculumProgramIdSchema.safeParse(programId);
  if (!parsed.success) return { success: false, error: "Invalid program ID." };

  const session = await resolveAuthSession();
  if (!session) return { success: false, error: "Authentication is required." };

  if (session.activeRole === ROLES.PROGRAM_HEAD) {
    const context = await resolveProgramHeadContext(parsed.data);
    if (!context.success) return context;
  } else if (
    session.activeRole !== ROLES.SECRETARY &&
    session.activeRole !== ROLES.DEAN &&
    session.activeRole !== ROLES.GEN_ED_COORDINATOR
  ) {
    return { success: false, error: "Course assignment management access required." };
  }

  try {
    const options = await listPublishedCurriculumCourseOptions(parsed.data);
    const filtered =
      session.activeRole === ROLES.GEN_ED_COORDINATOR
        ? options.filter((option) => option.courseScope === "GENERAL_EDUCATION")
        : session.activeRole === ROLES.PROGRAM_HEAD
          ? options.filter((option) => option.courseScope !== "GENERAL_EDUCATION")
          : options;
    return {
      success: true,
      data: filtered,
    };
  } catch (error) {
    console.error("Failed to load curriculum course options", {
      programId: parsed.data,
      error: error instanceof Error ? { name: error.name } : { type: typeof error },
    });
    return {
      success: false,
      error: "Unable to load published curriculum courses. Please try again.",
    };
  }
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
    revalidateCourseAssignmentRoutes(result.data?.programIds ?? parsed.data.selectedProgramId);
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

  const result = await deactivateCourseAssignment(parsed.data);

  if (result.success) {
    revalidateCourseAssignmentRoutes(result.data?.programIds ?? parsed.data.programId);
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
    revalidateCourseAssignmentRoutes(result.data?.programIds ?? parsed.data.programId);
  }

  return result;
}
export async function bulkSetCourseAssignmentsActiveAction(input: {
  assignmentIds: string[];
  isActive: boolean;
  programId?: string;
}): Promise<BulkCourseAssignmentLifecycleResult> {
  const ids = input.assignmentIds;
  if (ids.length === 0 || ids.length > 100 || new Set(ids).size !== ids.length) {
    return {
      succeeded: [],
      failed: [{ id: "selection", error: "Select between 1 and 100 unique assignments." }],
    };
  }

  const result: BulkCourseAssignmentLifecycleResult = { succeeded: [], failed: [] };
  const programIds = new Set<string>();
  for (const assignmentId of ids) {
    const item = input.isActive
      ? await activateCourseAssignment({ assignmentId, programId: input.programId })
      : await deactivateCourseAssignment({ assignmentId, programId: input.programId });
    if (item.success) {
      result.succeeded.push(assignmentId);
      for (const programId of item.data?.programIds ?? []) programIds.add(programId);
    } else {
      result.failed.push({
        id: assignmentId,
        error: item.error,
        referenceId: "referenceId" in item ? item.referenceId : undefined,
      });
    }
  }
  if (result.succeeded.length > 0) {
    revalidateCourseAssignmentRoutes([...programIds]);
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
    revalidateCourseAssignmentRoutes(result.data?.programIds ?? parsed.data.programId);
  }

  return result;
}

/**
 * Load current server-owned facts for the destructive confirmation dialog.
 */
export async function preflightCourseAssignmentDeletionAction(
  input: string | { assignmentId: string; programId?: string }
): Promise<CourseAssignmentResult<CourseAssignmentDeletionPreflight>> {
  const parsed = preflightCourseAssignmentDeletionSchema.safeParse(
    typeof input === "string" ? { assignmentId: input } : input
  );
  if (!parsed.success) return { success: false, error: "Invalid course assignment." };
  return preflightCourseAssignmentDeletion(parsed.data);
}

/**
 * Bulk create course assignments.
 */
export async function bulkCreateCourseAssignmentsAction(input: BulkCreateCourseAssignmentsInput) {
  const parsed = bulkCreateCourseAssignmentsSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, errors: [{ index: -1, error: "Invalid input" }], created: 0 };
  }

  const result = await bulkCreateCourseAssignments(
    parsed.data.assignments,
    parsed.data.selectedProgramId
  );

  if (result.success) {
    revalidateCourseAssignmentRoutes(
      parsed.data.selectedProgramId ??
        parsed.data.assignments.map((assignment) => assignment.programId)
    );
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
