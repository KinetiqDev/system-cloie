"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { commitOutcomeWrite, prepareOutcomeWrite } from "@/features/outcomes/services/manage-outcome-writes";

async function writeCilo(input: Parameters<typeof prepareOutcomeWrite>[0]): Promise<{ success: boolean; error?: string }> {
  const review = await prepareOutcomeWrite(input);
  if (!review.success) return review;
  return commitOutcomeWrite(review.data, true);
}

// ---------------------------------------------------------------------------
// Load CILOs for a course
// ---------------------------------------------------------------------------

export async function loadCilosForCourseAction(courseId: string): Promise<{
  success: boolean;
  cilos?: Array<{ id: string; description: string }>;
  error?: string;
}> {
  const session = await resolveAuthSession();

  if (!session || !session.roles.includes(ROLES.FACULTY)) {
    return { success: false, error: "Faculty authentication required." };
  }

  const assignment = await prisma.courseAssignment.findFirst({
    where: { faculty_id: session.userId, course_id: courseId, is_active: true, term_instance: { status: "ACTIVE" } },
    select: { id: true },
  });
  if (!assignment) return { success: false, error: "You do not have permission to manage CILOs for this course." };

  const cilos = await prisma.cILO.findMany({
    where: { course_id: courseId, is_active: true },
    select: { id: true, description: true },
    orderBy: { created_at: "asc" },
  });

  return { success: true, cilos };
}

// ---------------------------------------------------------------------------
// Save CILOs for a course
// ---------------------------------------------------------------------------

export async function saveCilosForCourseAction(
  courseId: string,
  cilos: Array<{ id?: string; description: string }>
): Promise<{ success: boolean; error?: string }> {
  const session = await resolveAuthSession();

  if (!session || !session.roles.includes(ROLES.FACULTY)) {
    return { success: false, error: "Faculty authentication required." };
  }

  const assignment = await prisma.courseAssignment.findFirst({
    where: { faculty_id: session.userId, course_id: courseId, is_active: true, term_instance: { status: "ACTIVE" } },
    select: { id: true },
  });
  if (!assignment) return { success: false, error: "You do not have permission to manage CILOs for this course." };

  // Validate course exists
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    return { success: false, error: "Course not found." };
  }

  // Filter out empty descriptions
  const validCilos = cilos
    .map((c) => ({ id: c.id, description: c.description.trim() }))
    .filter((c) => c.description.length > 0);

  const toUpdate = validCilos.filter((c) => c.id);
  const toCreate = validCilos.filter((c) => !c.id);
  const keepIds = new Set(toUpdate.map((c) => c.id!));

  try {
    const existingCilos = await prisma.cILO.findMany({
      where: { course_id: courseId, is_active: true },
      select: { id: true },
    });
    const existingIds = new Set(existingCilos.map((cilo) => cilo.id));
    if (toUpdate.some((item) => !existingIds.has(item.id!))) {
      return { success: false, error: "CILO not found for this course." };
    }

    const toArchiveIds = existingCilos.filter((cilo) => !keepIds.has(cilo.id)).map((cilo) => cilo.id);
    for (const id of toArchiveIds) {
      const result = await writeCilo({ kind: "CILO", action: "archive", id });
      if (!result.success) return result;
    }
    for (const item of toUpdate) {
      const result = await writeCilo({ kind: "CILO", action: "update", id: item.id!, description: item.description });
      if (!result.success) return result;
      await prisma.instrumentTemplateCiloQuestionBinding.updateMany({
        where: { cilo_id: item.id! },
        data: { cilo_description_snapshot: item.description },
      });
    }
    for (const item of toCreate) {
      const result = await writeCilo({ kind: "CILO", action: "create", courseId, description: item.description });
      if (!result.success) return result;
    }
  } catch (err) {
    console.error("Failed to save CILOs:", err);
    return { success: false, error: "Failed to save CILOs." };
  }

  revalidatePath("/faculty/cilos");
  return { success: true };
}

async function setCiloActiveAction(
  courseId: string,
  ciloId: string,
  is_active: boolean
): Promise<{ success: boolean; error?: string }> {
  const session = await resolveAuthSession();

  if (!session || !session.roles.includes(ROLES.FACULTY)) {
    return { success: false, error: "Faculty authentication required." };
  }

  const assignment = await prisma.courseAssignment.findFirst({
    where: { faculty_id: session.userId, course_id: courseId, is_active: true, term_instance: { status: "ACTIVE" } },
    select: { id: true },
  });
  if (!assignment) return { success: false, error: "You do not have permission to manage CILOs for this course." };

  const result = await writeCilo({ kind: "CILO", action: is_active ? "restore" : "archive", id: ciloId });
  if (!result.success) return result;

  revalidatePath("/faculty/cilos");
  return { success: true };
}

export function archiveCiloForCourseAction(courseId: string, ciloId: string) {
  return setCiloActiveAction(courseId, ciloId, false);
}

export function restoreCiloForCourseAction(courseId: string, ciloId: string) {
  return setCiloActiveAction(courseId, ciloId, true);
}

// ---------------------------------------------------------------------------
// Add CILOs to a course (batch add from the new page)
// ---------------------------------------------------------------------------

export async function addCilosToCourseAction(
  courseId: string,
  descriptions: string[]
): Promise<{ success: boolean; error?: string }> {
  const session = await resolveAuthSession();

  if (!session || !session.roles.includes(ROLES.FACULTY)) {
    return { success: false, error: "Faculty authentication required." };
  }

  const assignment = await prisma.courseAssignment.findFirst({
    where: { faculty_id: session.userId, course_id: courseId, is_active: true, term_instance: { status: "ACTIVE" } },
    select: { id: true },
  });
  if (!assignment) return { success: false, error: "You do not have permission to manage CILOs for this course." };

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    return { success: false, error: "Course not found." };
  }

  const validDescriptions = descriptions.filter((d) => d.trim().length > 0);

  if (validDescriptions.length === 0) {
    return { success: false, error: "At least one CILO is required." };
  }

  try {
    for (const description of validDescriptions) {
      const result = await writeCilo({ kind: "CILO", action: "create", courseId, description });
      if (!result.success) return result;
    }
  } catch (err) {
    console.error("Failed to add CILOs:", err);
    return { success: false, error: "Failed to add CILOs." };
  }

  revalidatePath("/faculty/cilos");
  return { success: true };
}
