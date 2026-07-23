import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { listFacultyCourseContexts } from "./list-faculty-course-contexts";
import { commitOutcomeWrite, prepareOutcomeWrite } from "@/features/outcomes/services/manage-outcome-writes";
import type {
  FacultyManagedCiloContext,
  FacultyManagedCiloLoadResult,
  FacultyManagedCiloSaveInput,
  FacultyManagedCiloSaveResult,
} from "../types";

async function assertFacultyManagedCiloScope(
  context: FacultyManagedCiloContext
): Promise<{ courseId: string; majorId: string | null; programId: string } | null> {
  const availableContexts = await listFacultyCourseContexts();

  if (!availableContexts.success) {
    return null;
  }

  const matchingContext = availableContexts.data.find(
    (candidate) =>
      candidate.courseId === context.courseId &&
      candidate.programId === context.programId &&
      candidate.majorId === context.majorId
  );

  if (!matchingContext) {
    return null;
  }

  return {
    courseId: matchingContext.courseId,
    majorId: matchingContext.majorId,
    programId: matchingContext.programId,
  };
}

export async function loadFacultyManagedCilos(
  context: FacultyManagedCiloContext
): Promise<FacultyManagedCiloLoadResult> {
  const authSession = await resolveAuthSession();

  if (authSession?.activeRole !== ROLES.FACULTY) {
    return {
      error: "Faculty authentication is required.",
      success: false,
    };
  }

  const scopedContext = await assertFacultyManagedCiloScope(context);

  if (!scopedContext) {
    return {
      error: "You do not have permission to manage CILOs for this course context.",
      success: false,
    };
  }

  const cilos = await prisma.cILO.findMany({
    where: {
      course_id: scopedContext.courseId,
      is_active: true,
    },
    orderBy: { created_at: "asc" },
    select: {
      description: true,
      id: true,
    },
  });

  return {
    success: true,
    data: {
      hasSavedCilos: cilos.length > 0,
      items: cilos,
    },
  };
}

export async function saveFacultyManagedCilos(
  input: FacultyManagedCiloSaveInput
): Promise<FacultyManagedCiloSaveResult> {
  const authSession = await resolveAuthSession();

  if (authSession?.activeRole !== ROLES.FACULTY) {
    return {
      error: "Faculty authentication is required.",
      success: false,
    };
  }

  const scopedContext = await assertFacultyManagedCiloScope(input);

  if (!scopedContext) {
    return {
      error: "You do not have permission to manage CILOs for this course context.",
      success: false,
    };
  }

  const normalizedItems = input.items
    .map((item) => ({ id: item.id, description: item.description.trim() }))
    .filter((item) => item.description.length > 0);

  const toUpdate = normalizedItems.filter((item) => item.id);
  const toCreate = normalizedItems.filter((item) => !item.id);
  const keepIds = new Set(toUpdate.map((item) => item.id!));

  const existingCilos = await prisma.cILO.findMany({
    where: { course_id: scopedContext.courseId, is_active: true },
    select: { id: true },
  });
  const existingIds = new Set(existingCilos.map((cilo) => cilo.id));
  if (toUpdate.some((item) => !existingIds.has(item.id!))) {
    return { error: "CILO not found for this course context.", success: false };
  }

  const writes = [
    ...existingCilos.filter((cilo) => !keepIds.has(cilo.id)).map((cilo) => ({ kind: "CILO" as const, action: "archive" as const, id: cilo.id })),
    ...toUpdate.map((item) => ({ kind: "CILO" as const, action: "update" as const, id: item.id!, description: item.description })),
    ...toCreate.map((item) => ({ kind: "CILO" as const, action: "create" as const, courseId: scopedContext.courseId, description: item.description })),
  ];
  for (const input of writes) {
    const review = await prepareOutcomeWrite(input);
    if (!review.success) return review;
    const result = await commitOutcomeWrite(review.data, true);
    if (!result.success) return result;
  }

  for (const item of toUpdate) {
    await prisma.instrumentTemplateCiloQuestionBinding.updateMany({
      where: { cilo_id: item.id! },
      data: { cilo_description_snapshot: item.description },
    });
  }

  const items = await prisma.cILO.findMany({
    where: {
      course_id: scopedContext.courseId,
      is_active: true,
    },
    orderBy: { created_at: "asc" },
    select: {
      description: true,
      id: true,
    },
  });

  return {
    success: true,
    data: {
      items,
    },
  };
}
