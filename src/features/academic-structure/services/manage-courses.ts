import { CourseScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { CreateCourseInput, UpdateCourseInput } from "../schemas/course";

import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

async function ensureCourseScopeContext(input: {
  course_scope: CourseScope;
  program_id?: string;
  major_id?: string;
}): Promise<ServiceResult<{ program_id: string | null; major_id: string | null }>> {
  if (input.course_scope === CourseScope.GENERAL_EDUCATION) {
    return {
      success: true,
      data: {
        program_id: null,
        major_id: null,
      },
    };
  }

  if (!input.program_id) {
    return { success: false, error: "Program-specific courses require a program." };
  }

  const program = await prisma.program.findUnique({
    where: { id: input.program_id },
    select: { id: true },
  });

  if (!program) {
    return { success: false, error: "Selected program was not found." };
  }

  if (!input.major_id) {
    return {
      success: true,
      data: {
        program_id: input.program_id,
        major_id: null,
      },
    };
  }

  const major = await prisma.major.findUnique({
    where: { id: input.major_id },
    select: { id: true, program_id: true },
  });

  if (!major) {
    return { success: false, error: "Selected major was not found." };
  }

  if (major.program_id !== input.program_id) {
    return {
      success: false,
      error: "Selected major does not belong to the selected program.",
    };
  }

  return {
    success: true,
    data: {
      program_id: input.program_id,
      major_id: input.major_id,
    },
  };
}

function countCourseEvaluations(course: {
  course_assignments: Array<{ _count: { course_bound_evaluations: number } }>;
}) {
  return course.course_assignments.reduce(
    (sum, assignment) => sum + assignment._count.course_bound_evaluations,
    0
  );
}

async function listCourses() {
  return prisma.course.findMany({
    include: {
      major: {
        select: {
          id: true,
          name: true,
        },
      },
      program: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      course_assignments: {
        select: {
          _count: {
            select: {
              course_bound_evaluations: true,
            },
          },
        },
      },
      _count: {
        select: {
          cilos: { where: { is_active: true } },
        },
      },
    },
    orderBy: [{ course_scope: "asc" }, { code: "asc" }],
  });
}

export async function createCourse(
  input: CreateCourseInput
): Promise<ServiceResult<{ id: string }>> {
  const scopeContext = await ensureCourseScopeContext(input);

  if (!scopeContext.success) {
    return scopeContext;
  }

  try {
    const course = await prisma.course.create({
      data: {
        code: input.code,
        title: input.title,
        description: input.description ?? null,
        course_scope: input.course_scope,
        default_year_level: input.default_year_level ?? null,
        default_semester: input.default_semester ?? null,
        default_term: input.default_term ?? null,
        ...scopeContext.data,
      },
    });

    return { success: true, data: { id: course.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: `A course with code "${input.code}" already exists.`,
      };
    }

    throw error;
  }
}

export async function updateCourse(
  input: UpdateCourseInput
): Promise<ServiceResult<{ id: string }>> {
  const scopeContext = await ensureCourseScopeContext(input);

  if (!scopeContext.success) {
    return scopeContext;
  }

  try {
    const course = await prisma.course.update({
      where: { id: input.id },
      data: {
        code: input.code,
        title: input.title,
        description: input.description ?? null,
        course_scope: input.course_scope,
        default_year_level: input.default_year_level ?? null,
        default_semester: input.default_semester ?? null,
        default_term: input.default_term ?? null,
        ...scopeContext.data,
      },
    });

    return { success: true, data: { id: course.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: `A course with code "${input.code}" already exists.`,
      };
    }

    throw error;
  }
}

export async function toggleCourseActive(id: string, is_active: boolean): Promise<ServiceResult> {
  await prisma.course.update({
    where: { id },
    data: { is_active },
  });

  return { success: true, data: undefined };
}

export async function deleteCourse(id: string): Promise<ServiceResult> {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      course_assignments: {
        select: {
          _count: {
            select: {
              course_bound_evaluations: true,
            },
          },
        },
      },
      _count: {
        select: {
          cilos: { where: { is_active: true } },
        },
      },
    },
  });

  if (!course) {
    return { success: false, error: "Course not found." };
  }

  const dependentCount = course._count.cilos + countCourseEvaluations(course);

  if (dependentCount > 0) {
    return {
      success: false,
      error: `Cannot delete ${course.code} - ${course.title}. It has ${dependentCount} dependent record(s). Deactivate it instead.`,
    };
  }

  await prisma.course.delete({ where: { id } });

  return { success: true, data: undefined };
}
