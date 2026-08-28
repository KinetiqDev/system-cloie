"use server";

import { revalidatePath } from "next/cache";

import {
  courseImportConfirmationRequestSchema,
  courseImportRequestSchema,
} from "@/features/academic-structure/schemas/course-import";
import { confirmCourseImport } from "@/features/academic-structure/services/confirm-course-import";
import { previewCourseImport } from "@/features/academic-structure/services/preview-course-import";
import { buildProgramHeadCoursesPath } from "@/lib/constants/program-head-routes";
import type {
  CourseImportConfirmation,
  CourseImportPreview,
} from "@/features/academic-structure/types/course-import";
import type { ServiceResult } from "@/lib/utils/service-result";

function firstIssue(error: { issues: Array<{ message?: string }> }): string {
  return error.issues[0]?.message ?? "Enter a valid Course import.";
}

function revalidateCourseImportPaths(input: {
  mode: "secretary" | "program-head" | "general-education";
  selectedProgramId?: string;
}) {
  if (input.mode === "secretary") {
    revalidatePath("/secretary/courses");
    return;
  }

  if (input.mode === "general-education") {
    revalidatePath("/gen-ed-coordinator/courses");
    return;
  }

  if (input.selectedProgramId) {
    revalidatePath(buildProgramHeadCoursesPath(input.selectedProgramId));
  }
}

export async function previewCourseImportAction(
  input: unknown
): Promise<ServiceResult<CourseImportPreview>> {
  const parsed = courseImportRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  return previewCourseImport(parsed.data);
}

export async function confirmCourseImportAction(
  input: unknown
): Promise<ServiceResult<CourseImportConfirmation>> {
  const parsed = courseImportConfirmationRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  const result = await confirmCourseImport(parsed.data);
  if (result.success && result.data.summary.created > 0) {
    revalidateCourseImportPaths(parsed.data);
  }
  return result;
}
