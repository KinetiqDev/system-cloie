import { CourseScope } from "@prisma/client";

import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";
import type { ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import type { CreateCourseInput, UpdateCourseInput } from "../schemas/course";

async function requireCoordinator(): Promise<ServiceResult<{ userId: string }>> {
  const session = await resolveAuthSession();
  if (session?.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    return { success: false, error: "General Education Coordinator access required." };
  }
  return { success: true, data: { userId: session.userId } };
}

export async function createGenEdCourse(
  input: CreateCourseInput
): Promise<ServiceResult<{ id: string }>> {
  const authorization = await requireCoordinator();
  if (!authorization.success) return authorization;

  try {
    const course = await prisma.course.create({
      data: {
        code: input.code,
        title: input.title,
        course_scope: CourseScope.GENERAL_EDUCATION,
        program_id: null,
        major_id: null,
        default_year_level: input.default_year_level ?? null,
        default_semester: input.default_semester ?? null,
        default_term: input.default_term ?? null,
      },
    });
    return { success: true, data: { id: course.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: `A course with code "${input.code}" already exists.` };
    }
    throw error;
  }
}

export async function updateGenEdCourse(
  input: UpdateCourseInput
): Promise<ServiceResult<{ id: string }>> {
  const authorization = await requireCoordinator();
  if (!authorization.success) return authorization;

  try {
    const result = await prisma.course.updateMany({
      where: {
        id: input.id,
        course_scope: CourseScope.GENERAL_EDUCATION,
        ...(input.updated_at ? { updated_at: new Date(input.updated_at) } : {}),
      },
      data: {
        code: input.code,
        title: input.title,
        default_year_level: input.default_year_level ?? null,
        default_semester: input.default_semester ?? null,
        default_term: input.default_term ?? null,
      },
    });
    if (result.count !== 1) {
      return {
        success: false,
        error: "Course not found, outside General Education scope, or updated by someone else.",
      };
    }
    return { success: true, data: { id: input.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: `A course with code "${input.code}" already exists.` };
    }
    throw error;
  }
}

export async function setGenEdCourseActive(id: string, isActive: boolean): Promise<ServiceResult> {
  const authorization = await requireCoordinator();
  if (!authorization.success) return authorization;

  const result = await prisma.course.updateMany({
    where: { id, course_scope: CourseScope.GENERAL_EDUCATION },
    data: { is_active: isActive },
  });
  if (result.count !== 1) {
    return { success: false, error: "Course not found or outside General Education scope." };
  }
  return { success: true, data: undefined };
}
