import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { CreateCourseInput, UpdateCourseInput } from "../schemas/course";

import { type ServiceResult } from "@/lib/utils/service-result";
import { isForeignKeyConstraintError, isUniqueConstraintError } from "@/lib/utils/prisma-errors";

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

  const data = {
    code: input.code,
    title: input.title,
    course_scope: input.course_scope,
    default_year_level: input.default_year_level ?? null,
    default_semester: input.default_semester ?? null,
    default_term: input.default_term ?? null,
    ...scopeContext.data,
  };

  try {
    if (input.updated_at) {
      // Optimistic concurrency: write only when the loaded snapshot is still
      // current, so an intervening update is not silently overwritten.
      const result = await prisma.course.updateMany({
        where: { id: input.id, updated_at: new Date(input.updated_at) },
        data,
      });

      if (result.count === 0) {
        const exists = await prisma.course.findUnique({
          where: { id: input.id },
          select: { id: true },
        });

        if (!exists) {
          return { success: false, error: "Course not found." };
        }

        return {
          success: false,
          error:
            "This course was updated by someone else. Reopen the edit dialog to load the latest details before saving.",
        };
      }

      return { success: true, data: { id: input.id } };
    }

    const course = await prisma.course.update({ where: { id: input.id }, data });

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
          curriculum_courses: true,
        },
      },
    },
  });

  if (!course) {
    return { success: false, error: "Course not found." };
  }

  if (course._count.curriculum_courses > 0) {
    return {
      success: false,
      error: "This course is referenced by one or more curriculum versions. Deactivate it instead.",
    };
  }

  const dependentCount = course._count.cilos + countCourseEvaluations(course);

  if (dependentCount > 0) {
    return {
      success: false,
      error: `Cannot delete ${course.code} - ${course.title}. It has ${dependentCount} dependent record(s). Deactivate it instead.`,
    };
  }

  try {
    await prisma.course.delete({ where: { id } });
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      const curriculumReferenceCount = await prisma.curriculumCourse.count({
        where: { course_id: id },
      });
      if (curriculumReferenceCount > 0) {
        return {
          success: false,
          error:
            "This course is referenced by one or more curriculum versions. Deactivate it instead.",
        };
      }
      return {
        success: false,
        error: "Cannot delete course; it has existing assignments. Deactivate it instead.",
      };
    }

    throw error;
  }

  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Read: edit payload
// ---------------------------------------------------------------------------

export type CourseEditData = {
  course: {
    id: string;
    code: string;
    title: string;
    course_scope: CourseScope;
    program_id: string | null;
    major_id: string | null;
    default_year_level: YearLevel | null;
    default_semester: AcademicSemester | null;
    default_term: AcademicTerm | null;
    updated_at: Date;
  };
  programs: { id: string; code: string; name: string }[];
  majors: { id: string; name: string; program_id: string; program_code: string }[];
};

export async function getCourseEditData(courseId: string): Promise<CourseEditData | null> {
  const [course, programs, majors] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        code: true,
        title: true,
        course_scope: true,
        program_id: true,
        major_id: true,
        default_year_level: true,
        default_semester: true,
        default_term: true,
        updated_at: true,
      },
    }),
    prisma.program.findMany({
      where: { is_active: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.major.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        program_id: true,
        program: { select: { code: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!course) {
    return null;
  }

  return {
    course,
    programs,
    majors: majors.map((m) => ({
      id: m.id,
      name: m.name,
      program_id: m.program_id,
      program_code: m.program.code,
    })),
  };
}
