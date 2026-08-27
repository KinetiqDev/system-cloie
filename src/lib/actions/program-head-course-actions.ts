"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import type { ZodType } from "zod";
import {
  createProgramHeadCourseSchema,
  toggleProgramHeadCourseSchema,
  updateProgramHeadCourseSchema,
} from "@/features/academic-structure/schemas/program-head-course";
import {
  createProgramHeadCourse,
  toggleProgramHeadCourseActive,
  updateProgramHeadCourse,
} from "@/features/academic-structure/services/manage-program-head-courses";
import { buildProgramHeadCoursesPath } from "@/lib/constants/program-head-routes";

type ActionResult = { success: true } | { success: false; error: string };
type BulkProgramHeadCourseResult = {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
};

function parseWithSchema<T>(
  schema: ZodType<T>,
  value: unknown
): { success: true; data: T } | { success: false; error: string } {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  return parsed;
}

function revalidateProgramHeadCourses(programId: string) {
  revalidatePath(buildProgramHeadCoursesPath(programId));
}

export async function createProgramHeadCourseAction(formData: FormData): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  if (session.activeRole !== ROLES.PROGRAM_HEAD) {
    return { error: "Insufficient permissions.", success: false };
  }

  const parsed = parseWithSchema(createProgramHeadCourseSchema, {
    programId: formData.get("programId"),
    course_type: formData.get("course_type"),
    code: formData.get("code"),
    title: formData.get("title"),
    course_scope: formData.get("course_scope"),
    major_id: formData.get("major_id"),
    default_year_level: formData.get("default_year_level"),
    default_semester: formData.get("default_semester"),
    default_term: formData.get("default_term"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await createProgramHeadCourse(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateProgramHeadCourses(parsed.data.programId);
  return { success: true };
}

export async function updateProgramHeadCourseAction(formData: FormData): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  if (session.activeRole !== ROLES.PROGRAM_HEAD) {
    return { error: "Insufficient permissions.", success: false };
  }

  const parsed = parseWithSchema(updateProgramHeadCourseSchema, {
    programId: formData.get("programId"),
    course_type: formData.get("course_type"),
    id: formData.get("id"),
    code: formData.get("code"),
    title: formData.get("title"),
    course_scope: formData.get("course_scope"),
    major_id: formData.get("major_id"),
    default_year_level: formData.get("default_year_level"),
    default_semester: formData.get("default_semester"),
    default_term: formData.get("default_term"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await updateProgramHeadCourse(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateProgramHeadCourses(parsed.data.programId);
  return { success: true };
}

export async function toggleProgramHeadCourseActiveAction(
  programId: string,
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  if (session.activeRole !== ROLES.PROGRAM_HEAD) {
    return { error: "Insufficient permissions.", success: false };
  }

  const parsed = parseWithSchema(toggleProgramHeadCourseSchema, { programId, id, is_active });
  if (!parsed.success) return parsed;

  const result = await toggleProgramHeadCourseActive(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateProgramHeadCourses(parsed.data.programId);
  return { success: true };
}

export async function bulkToggleProgramHeadCoursesActiveAction(
  programId: string,
  ids: string[],
  isActive: boolean
): Promise<BulkProgramHeadCourseResult> {
  const session = await resolveAuthSession();
  if (session?.activeRole !== ROLES.PROGRAM_HEAD) {
    return { succeeded: [], failed: ids.map((id) => ({ id, error: "Insufficient permissions." })) };
  }
  if (ids.length === 0 || ids.length > 100 || new Set(ids).size !== ids.length) {
    return {
      succeeded: [],
      failed: [{ id: "selection", error: "Select between 1 and 100 unique courses." }],
    };
  }

  const result: BulkProgramHeadCourseResult = { succeeded: [], failed: [] };
  for (const id of ids) {
    const item = await toggleProgramHeadCourseActive({ programId, id, is_active: isActive });
    if (item.success) result.succeeded.push(id);
    else result.failed.push({ id, error: item.error });
  }
  if (result.succeeded.length > 0) revalidateProgramHeadCourses(programId);
  return result;
}
