"use server";

import { CourseScope } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  createCourseSchema,
  updateCourseSchema,
} from "@/features/academic-structure/schemas/course";
import {
  createGenEdCourse,
  setGenEdCourseActive,
  updateGenEdCourse,
} from "@/features/academic-structure/services/manage-gen-ed-courses";

const COURSE_ROUTE = "/gen-ed-coordinator/courses";

type ActionResult = { success: true } | { success: false; error: string };
export type BulkGenEdCourseResult = {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
};

function normalizeFormData(formData: FormData) {
  return {
    id: formData.get("id"),
    code: formData.get("code"),
    title: formData.get("title"),
    course_scope: CourseScope.GENERAL_EDUCATION,
    program_id: undefined,
    major_id: undefined,
    default_year_level: formData.get("default_year_level"),
    default_semester: formData.get("default_semester"),
    default_term: formData.get("default_term"),
    updated_at: formData.get("updated_at"),
  };
}

export async function createGenEdCourseAction(formData: FormData): Promise<ActionResult> {
  const parsed = createCourseSchema.safeParse(normalizeFormData(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid course." };
  }
  const result = await createGenEdCourse(parsed.data);
  if (!result.success) return result;
  revalidatePath(COURSE_ROUTE);
  return { success: true };
}

export async function updateGenEdCourseAction(formData: FormData): Promise<ActionResult> {
  const parsed = updateCourseSchema.safeParse(normalizeFormData(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid course." };
  }
  const result = await updateGenEdCourse(parsed.data);
  if (!result.success) return result;
  revalidatePath(COURSE_ROUTE);
  return { success: true };
}

export async function setGenEdCourseActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const result = await setGenEdCourseActive(id, isActive);
  if (!result.success) return result;
  revalidatePath(COURSE_ROUTE);
  return { success: true };
}

export async function bulkSetGenEdCoursesActiveAction(
  ids: string[],
  isActive: boolean
): Promise<BulkGenEdCourseResult> {
  if (ids.length === 0 || ids.length > 100 || new Set(ids).size !== ids.length) {
    return {
      succeeded: [],
      failed: [{ id: "selection", error: "Select between 1 and 100 unique courses." }],
    };
  }
  const result: BulkGenEdCourseResult = { succeeded: [], failed: [] };
  for (const id of ids) {
    const item = await setGenEdCourseActive(id, isActive);
    if (item.success) result.succeeded.push(id);
    else result.failed.push({ id, error: item.error });
  }
  if (result.succeeded.length > 0) revalidatePath(COURSE_ROUTE);
  return result;
}
