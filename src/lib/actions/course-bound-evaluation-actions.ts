"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listFacultyCourseContexts } from "@/features/evaluations/services/list-faculty-course-contexts";
import { loadFacultyManagedCilos } from "@/features/evaluations/services/manage-faculty-cilos";
import { ROLES } from "@/lib/constants/roles";
import { previewCourseBoundRespondents } from "@/features/evaluations/services/preview-course-bound-respondents";
import { publishCourseBoundEvaluation } from "@/features/evaluations/services/publish-course-bound-evaluation";
import { lateIncludeCourseBoundEvaluationSchema } from "@/features/evaluations/schemas/late-include-course-bound-evaluation";
import { lateIncludeCourseBoundEvaluationStudent } from "@/features/evaluations/services/late-include-course-bound-evaluation";
import { publishCourseBoundEvaluationSchema } from "@/features/evaluations/schemas/course-bound-publication";
import type {
  FacultyManagedCiloContext,
  PreviewCourseBoundRespondentsInput,
  PreviewCourseBoundRespondentsResult,
  PublishCourseBoundEvaluationInput,
  PublishCourseBoundEvaluationResult,
  LateIncludeCourseBoundEvaluationInput,
  LateIncludeCourseBoundEvaluationResult,
} from "@/features/evaluations/types";

export async function listFacultyCourseContextsAction() {
  return await listFacultyCourseContexts();
}

export async function publishCourseBoundEvaluationAction(
  payload: PublishCourseBoundEvaluationInput
): Promise<PublishCourseBoundEvaluationResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }

  const allowedRoles: string[] = [ROLES.FACULTY, ROLES.PROGRAM_HEAD, ROLES.DEAN, ROLES.SECRETARY];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }

  const parsed = publishCourseBoundEvaluationSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }

  const result = await publishCourseBoundEvaluation(parsed.data);

  if (result.success) {
    revalidatePath("/faculty/tools");
    revalidatePath("/program-head/cilo-reviews");
  }

  return result;
}

export async function previewCourseBoundRespondentsAction(
  payload: PreviewCourseBoundRespondentsInput
): Promise<PreviewCourseBoundRespondentsResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }

  const allowedRoles: string[] = [ROLES.FACULTY, ROLES.PROGRAM_HEAD, ROLES.DEAN, ROLES.SECRETARY];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }

  return await previewCourseBoundRespondents(payload);
}

export async function lateIncludeCourseBoundEvaluationAction(
  payload: LateIncludeCourseBoundEvaluationInput
): Promise<LateIncludeCourseBoundEvaluationResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }

  const parsed = lateIncludeCourseBoundEvaluationSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }

  const result = await lateIncludeCourseBoundEvaluationStudent(parsed.data);
  if (result.success) {
    revalidatePath("/faculty/tools");
    revalidatePath("/student/evaluations");
  }
  return result;
}

export async function loadFacultyManagedCilosAction(payload: FacultyManagedCiloContext) {
  return await loadFacultyManagedCilos(payload);
}
