import { CourseScope, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  revalidateProgramHeadAssignment,
  resolveProgramHeadContext,
} from "@/features/auth/services/resolve-program-head-context";
import type {
  CreateProgramHeadCourseInput,
  ToggleProgramHeadCourseInput,
  UpdateProgramHeadCourseInput,
} from "../schemas/program-head-course";
import type { ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

type CourseWriteResult = ServiceResult<{ id: string }>;

function assignmentFailure(): ServiceResult<never> {
  return { success: false, error: "Selected Program is no longer assigned." };
}

async function validateMajorBelongsToProgram(
  db: typeof prisma | Prisma.TransactionClient,
  majorId: string,
  programId: string
): Promise<ServiceResult<{ programId: string }>> {
  const major = await db.major.findUnique({
    where: { id: majorId },
    select: { id: true, program_id: true, is_active: true },
  });

  if (!major) {
    return { success: false, error: "Selected major was not found." };
  }

  if (!major.is_active) {
    return { success: false, error: "Selected major is not active." };
  }

  if (major.program_id !== programId) {
    return { success: false, error: "Selected major does not belong to the selected program." };
  }

  return { success: true, data: { programId: major.program_id } };
}

async function withSelectedAssignment<T>(
  userId: string,
  programId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<ServiceResult<T>>
): Promise<ServiceResult<T>> {
  return prisma.$transaction(async (tx) => {
    const selectedProgram = await revalidateProgramHeadAssignment(tx, { userId, programId });
    if (!selectedProgram) return assignmentFailure();
    return callback(tx);
  });
}

export async function createProgramHeadCourse(
  input: CreateProgramHeadCourseInput
): Promise<CourseWriteResult> {
  const contextResult = await resolveProgramHeadContext(input.programId);
  if (!contextResult.success) return contextResult;

  try {
    return await withSelectedAssignment(
      contextResult.data.userId,
      contextResult.data.selectedProgram.id,
      async (tx) => {
        let majorId: string | null = null;
        if (input.major_id) {
          const majorResult = await validateMajorBelongsToProgram(
            tx,
            input.major_id,
            contextResult.data.selectedProgram.id
          );
          if (!majorResult.success) return majorResult;
          majorId = input.major_id;
        }

        const course = await tx.course.create({
          data: {
            code: input.code,
            title: input.title,
            course_scope: CourseScope.PROGRAM_SPECIFIC,
            program_id: contextResult.data.selectedProgram.id,
            major_id: majorId,
            default_year_level: input.default_year_level ?? null,
            default_semester: input.default_semester ?? null,
            default_term: input.default_term ?? null,
          },
        });

        return { success: true, data: { id: course.id } };
      }
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: `A course with code "${input.code}" already exists.` };
    }
    throw error;
  }
}

export async function updateProgramHeadCourse(
  input: UpdateProgramHeadCourseInput
): Promise<CourseWriteResult> {
  const contextResult = await resolveProgramHeadContext(input.programId);
  if (!contextResult.success) return contextResult;

  try {
    return await withSelectedAssignment(
      contextResult.data.userId,
      contextResult.data.selectedProgram.id,
      async (tx) => {
        const existingCourse = await tx.course.findUnique({
          where: { id: input.id },
          select: { id: true, program_id: true, course_scope: true },
        });

        if (!existingCourse) return { success: false, error: "Course not found." };
        if (existingCourse.course_scope === CourseScope.GENERAL_EDUCATION) {
          return {
            success: false,
            error: "General education courses cannot be modified by Program Heads.",
          };
        }
        if (existingCourse.program_id !== contextResult.data.selectedProgram.id) {
          return { success: false, error: "You do not have permission to modify this course." };
        }

        let majorId: string | null = null;
        if (input.major_id) {
          const majorResult = await validateMajorBelongsToProgram(
            tx,
            input.major_id,
            contextResult.data.selectedProgram.id
          );
          if (!majorResult.success) return majorResult;
          majorId = input.major_id;
        }

        const updateResult = await tx.course.updateMany({
          where: {
            id: input.id,
            program_id: contextResult.data.selectedProgram.id,
            course_scope: CourseScope.PROGRAM_SPECIFIC,
          },
          data: {
            code: input.code,
            title: input.title,
            course_scope: CourseScope.PROGRAM_SPECIFIC,
            program_id: contextResult.data.selectedProgram.id,
            major_id: majorId,
            default_year_level: input.default_year_level ?? null,
            default_semester: input.default_semester ?? null,
            default_term: input.default_term ?? null,
          },
        });

        if (updateResult.count !== 1) {
          return { success: false, error: "You do not have permission to modify this course." };
        }

        return { success: true, data: { id: input.id } };
      }
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: `A course with code "${input.code}" already exists.` };
    }
    throw error;
  }
}

export async function toggleProgramHeadCourseActive(
  input: ToggleProgramHeadCourseInput
): Promise<ServiceResult> {
  const contextResult = await resolveProgramHeadContext(input.programId);
  if (!contextResult.success) return contextResult;

  return withSelectedAssignment(
    contextResult.data.userId,
    contextResult.data.selectedProgram.id,
    async (tx) => {
      const existingCourse = await tx.course.findUnique({
        where: { id: input.id },
        select: { id: true, program_id: true, course_scope: true },
      });

      if (!existingCourse) return { success: false, error: "Course not found." };
      if (existingCourse.course_scope === CourseScope.GENERAL_EDUCATION) {
        return {
          success: false,
          error: "General education courses cannot be modified by Program Heads.",
        };
      }
      if (existingCourse.program_id !== contextResult.data.selectedProgram.id) {
        return { success: false, error: "You do not have permission to modify this course." };
      }

      const updateResult = await tx.course.updateMany({
        where: {
          id: input.id,
          program_id: contextResult.data.selectedProgram.id,
          course_scope: CourseScope.PROGRAM_SPECIFIC,
        },
        data: { is_active: input.is_active },
      });

      if (updateResult.count !== 1) {
        return { success: false, error: "You do not have permission to modify this course." };
      }

      return { success: true, data: undefined };
    }
  );
}
