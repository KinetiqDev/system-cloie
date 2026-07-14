"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";

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
    await prisma.$transaction(async (tx) => {
      // Fetch existing CILOs for this course
      const existingCilos = await tx.cILO.findMany({
        where: { course_id: courseId, is_active: true },
        select: { id: true },
      });

      // Archive CILOs absent from input. Preserve their mappings for restore.
      const toArchiveIds = existingCilos
        .filter((c) => !keepIds.has(c.id))
        .map((c) => c.id);

      if (toArchiveIds.length > 0) {
        await tx.cILO.updateMany({
          where: { id: { in: toArchiveIds } },
          data: { is_active: false },
        });
      }

      // Update existing CILOs with new descriptions
      for (const item of toUpdate) {
        await tx.cILO.update({
          where: { id: item.id! },
          data: { description: item.description, is_active: true },
        });
      }

      // Create new CILOs
      if (toCreate.length > 0) {
        await tx.cILO.createMany({
          data: toCreate.map((item) => ({
            course_id: courseId,
            description: item.description,
            created_by: session.userId,
          })),
        });
      }

      // Update template binding snapshots for updated CILOs.
      // This only affects InstrumentTemplateCiloQuestionBinding (draft/template-level).
      // Published evaluations use a separate CourseBoundCiloQuestionBinding table whose
      // snapshots are frozen at publish time and are NOT affected by this update.
      for (const item of toUpdate) {
        await tx.instrumentTemplateCiloQuestionBinding.updateMany({
          where: { cilo_id: item.id! },
          data: { cilo_description_snapshot: item.description },
        });
      }
    });
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

  const result = await prisma.cILO.updateMany({
    where: { id: ciloId, course_id: courseId },
    data: { is_active },
  });

  if (result.count === 0) {
    return { success: false, error: "CILO not found for this course." };
  }

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
    await prisma.cILO.createMany({
      data: validDescriptions.map((desc) => ({
        course_id: courseId,
        description: desc.trim(),
        created_by: session.userId,
      })),
    });
  } catch (err) {
    console.error("Failed to add CILOs:", err);
    return { success: false, error: "Failed to add CILOs." };
  }

  revalidatePath("/faculty/cilos");
  return { success: true };
}
