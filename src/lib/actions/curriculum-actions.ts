"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { ROLES } from "@/lib/constants/roles";
import type { ServiceResult } from "@/lib/utils/service-result";
import {
  addCurriculumCourseSchema,
  cloneCurriculumVersionSchema,
  createCurriculumVersionSchema,
  publishCurriculumVersionSchema,
  removeCurriculumCourseSchema,
  retireCurriculumVersionSchema,
  updateCurriculumCourseSchema,
  updateCurriculumVersionSchema,
} from "@/features/curriculum/schemas/curriculum";
import {
  addCurriculumCourse,
  removeCurriculumCourse,
  updateCurriculumCourse,
} from "@/features/curriculum/services/manage-curriculum-courses";
import {
  cloneCurriculumVersion,
  createCurriculumVersion,
  publishCurriculumVersion,
  retireCurriculumVersion,
  updateCurriculumVersion,
} from "@/features/curriculum/services/manage-curriculum-versions";
import {
  getCurriculumVersionDetail,
  getCurriculumCourseProgramId,
  getCurriculumVersionProgramId,
} from "@/features/curriculum/services/read-curriculum";
import {
  listProgramCurriculaSummary,
  listCurriculumCourseOptions,
} from "@/features/curriculum/services/read-curriculum-pages";
import type {
  AddCurriculumCourseInput,
  CreateCurriculumVersionInput,
  CurriculumCourseOption,
  CurriculumVersionDetail,
  CurriculumVersionSummaryItem,
  UpdateCurriculumCourseInput,
  UpdateCurriculumVersionInput,
} from "@/features/curriculum/types";
import { buildProgramHeadCurriculaPath } from "@/lib/constants/program-head-routes";

const idSchema = z.string().uuid("Invalid ID");

function revalidateCurriculumRoutes(programId: string) {
  revalidatePath("/secretary/curricula");
  revalidatePath(buildProgramHeadCurriculaPath(programId));
}

async function authorizeCurriculumRead(programId: string): Promise<ServiceResult<null>> {
  const session = await resolveAuthSession();
  if (!session) return { success: false, error: "Authentication is required." };

  if (session.activeRole === ROLES.SECRETARY) {
    return { success: true, data: null };
  }

  if (session.activeRole !== ROLES.PROGRAM_HEAD) {
    return { success: false, error: "Secretary or Program Head access required." };
  }

  const context = await resolveProgramHeadContext(programId);
  return context.success ? { success: true, data: null } : context;
}

async function authorizeCurriculumWriteRequest(): Promise<ServiceResult<null>> {
  const session = await resolveAuthSession();
  if (!session) return { success: false, error: "Authentication is required." };
  if (session.activeRole !== ROLES.SECRETARY && session.activeRole !== ROLES.PROGRAM_HEAD) {
    return { success: false, error: "Secretary or Program Head access required." };
  }
  return { success: true, data: null };
}

async function findProgramIdForVersion(versionId: string): Promise<string | null> {
  return getCurriculumVersionProgramId(versionId);
}

async function authorizeCurriculumWrite(programId: string): Promise<ServiceResult<null>> {
  return authorizeCurriculumRead(programId);
}

export async function createCurriculumVersionAction(input: CreateCurriculumVersionInput) {
  const parsed = createCurriculumVersionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const access = await authorizeCurriculumWrite(parsed.data.programId);
  if (!access.success) return access;

  const result = await createCurriculumVersion(parsed.data);
  if (result.success) revalidateCurriculumRoutes(parsed.data.programId);
  return result;
}

export async function updateCurriculumVersionAction(
  id: string,
  input: UpdateCurriculumVersionInput
) {
  const parsed = updateCurriculumVersionSchema.safeParse({ ...input, id });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const requestAccess = await authorizeCurriculumWriteRequest();
  if (!requestAccess.success) return requestAccess;
  const programId = await findProgramIdForVersion(parsed.data.id);
  if (programId) {
    const access = await authorizeCurriculumWrite(programId);
    if (!access.success) return access;
  }
  const { id: versionId, ...metadata } = parsed.data;
  const result = await updateCurriculumVersion(versionId, metadata);
  if (result.success && programId) revalidateCurriculumRoutes(programId);
  return result;
}

export async function publishCurriculumVersionAction(id: string) {
  const parsed = retireCurriculumVersionSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const requestAccess = await authorizeCurriculumWriteRequest();
  if (!requestAccess.success) return requestAccess;
  const programId = await findProgramIdForVersion(parsed.data.id);
  if (programId) {
    const access = await authorizeCurriculumWrite(programId);
    if (!access.success) return access;
  }
  const result = await publishCurriculumVersion(parsed.data.id);
  if (result.success && programId) revalidateCurriculumRoutes(programId);
  return result;
}

export async function retireCurriculumVersionAction(id: string) {
  const parsed = cloneCurriculumVersionSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const requestAccess = await authorizeCurriculumWriteRequest();
  if (!requestAccess.success) return requestAccess;
  const programId = await findProgramIdForVersion(parsed.data.id);
  if (programId) {
    const access = await authorizeCurriculumWrite(programId);
    if (!access.success) return access;
  }
  const result = await retireCurriculumVersion(parsed.data.id);
  if (result.success && programId) revalidateCurriculumRoutes(programId);
  return result;
}

export async function cloneCurriculumVersionAction(id: string) {
  const parsed = publishCurriculumVersionSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const requestAccess = await authorizeCurriculumWriteRequest();
  if (!requestAccess.success) return requestAccess;
  const programId = await findProgramIdForVersion(parsed.data.id);
  if (programId) {
    const access = await authorizeCurriculumWrite(programId);
    if (!access.success) return access;
  }
  const result = await cloneCurriculumVersion(parsed.data.id);
  if (result.success && programId) revalidateCurriculumRoutes(programId);
  return result;
}

export async function addCurriculumCourseAction(input: AddCurriculumCourseInput) {
  const parsed = addCurriculumCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const requestAccess = await authorizeCurriculumWriteRequest();
  if (!requestAccess.success) return requestAccess;
  const programId = await findProgramIdForVersion(parsed.data.curriculumVersionId);
  if (!programId) return { success: false, error: "Curriculum version not found" };
  const access = await authorizeCurriculumWrite(programId);
  if (!access.success) return access;
  const result = await addCurriculumCourse(parsed.data);
  if (result.success) revalidateCurriculumRoutes(programId);
  return result;
}

export async function removeCurriculumCourseAction(id: string) {
  const parsed = removeCurriculumCourseSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const requestAccess = await authorizeCurriculumWriteRequest();
  if (!requestAccess.success) return requestAccess;
  const programId = await getCurriculumCourseProgramId(parsed.data.id);
  if (programId) {
    const access = await authorizeCurriculumWrite(programId);
    if (!access.success) return access;
  }
  const result = await removeCurriculumCourse(parsed.data.id);
  if (result.success && programId) revalidateCurriculumRoutes(programId);
  return result;
}

export async function updateCurriculumCourseAction(id: string, input: UpdateCurriculumCourseInput) {
  const parsed = updateCurriculumCourseSchema.safeParse({ ...input, id });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const requestAccess = await authorizeCurriculumWriteRequest();
  if (!requestAccess.success) return requestAccess;
  const programId = await getCurriculumCourseProgramId(parsed.data.id);
  if (programId) {
    const access = await authorizeCurriculumWrite(programId);
    if (!access.success) return access;
  }
  const { id: courseId, ...placement } = parsed.data;
  const result = await updateCurriculumCourse(courseId, placement);
  if (result.success && programId) revalidateCurriculumRoutes(programId);
  return result;
}

/**
 * List the Curriculum Versions of one program with course counts, newest
 * first. Authorized for the Secretary or the Program Head's selected program.
 */
export async function listProgramCurriculaSummaryAction(
  programId: string
): Promise<ServiceResult<CurriculumVersionSummaryItem[]>> {
  const parsed = idSchema.safeParse(programId);
  if (!parsed.success) return { success: false, error: "Invalid program ID." };

  const access = await authorizeCurriculumRead(parsed.data);
  if (!access.success) return access;

  return { success: true, data: await listProgramCurriculaSummary(parsed.data) };
}

/**
 * List active course options for the add-course picker, scoped to one program
 * (program-specific plus General Education). Authorized for the Secretary or
 * the Program Head's selected program.
 */
export async function listProgramCourseOptionsAction(
  programId: string
): Promise<ServiceResult<CurriculumCourseOption[]>> {
  const parsed = idSchema.safeParse(programId);
  if (!parsed.success) return { success: false, error: "Invalid program ID." };

  const access = await authorizeCurriculumRead(parsed.data);
  if (!access.success) return access;

  return { success: true, data: await listCurriculumCourseOptions(parsed.data) };
}

export async function getCurriculumVersionDetailAction(
  id: string
): Promise<ServiceResult<CurriculumVersionDetail | null>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "Invalid curriculum version ID." };

  const programId = await findProgramIdForVersion(parsed.data);
  if (!programId) return { success: true, data: null };

  const access = await authorizeCurriculumRead(programId);
  if (!access.success) return access;

  const version = await getCurriculumVersionDetail(parsed.data);
  if (!version) return { success: true, data: null };

  return { success: true, data: version };
}
