import { prisma } from "@/lib/db/prisma";
import type {
  CreateMajorInput,
  CreateProgramInput,
  UpdateMajorInput,
  UpdateProgramInput,
} from "../schemas/program";

import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

async function listPrograms() {
  return prisma.program.findMany({
    include: {
      majors: {
        where: { is_active: true },
        orderBy: { name: "asc" },
      },
      _count: {
        select: {
          courses: true,
          gos: true,
          student_profiles: true,
          faculty_program_affiliations: true,
        },
      },
    },
    orderBy: { code: "asc" },
  });
}

export async function getProgram(id: string) {
  return prisma.program.findUnique({
    where: { id },
    include: {
      majors: {
        orderBy: { name: "asc" },
      },
      _count: {
        select: {
          courses: true,
          gos: true,
          student_profiles: true,
          faculty_program_affiliations: true,
        },
      },
    },
  });
}

export async function createProgram(
  input: CreateProgramInput
): Promise<ServiceResult<{ id: string }>> {
  try {
    const program = await prisma.program.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description ?? null,
      },
    });

    return { success: true, data: { id: program.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: `A program with code "${input.code}" already exists.`,
      };
    }

    throw error;
  }
}

export async function updateProgram(
  input: UpdateProgramInput
): Promise<ServiceResult<{ id: string }>> {
  try {
    const program = await prisma.program.update({
      where: { id: input.id },
      data: {
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
      },
    });

    return { success: true, data: { id: program.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: `A program with code "${input.code}" already exists.`,
      };
    }

    throw error;
  }
}

export async function toggleProgramActive(id: string, is_active: boolean): Promise<ServiceResult> {
  await prisma.program.update({
    where: { id },
    data: { is_active },
  });

  return { success: true, data: undefined };
}

export async function createMajor(input: CreateMajorInput): Promise<ServiceResult<{ id: string }>> {
  try {
    const major = await prisma.major.create({
      data: {
        program_id: input.program_id,
        name: input.name,
      },
    });

    return { success: true, data: { id: major.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: `A major named "${input.name}" already exists in this program.`,
      };
    }

    throw error;
  }
}

export async function updateMajor(input: UpdateMajorInput): Promise<ServiceResult<{ id: string }>> {
  try {
    const major = await prisma.major.update({
      where: { id: input.id },
      data: {
        name: input.name,
        ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
      },
    });

    return { success: true, data: { id: major.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: `A major named "${input.name}" already exists in this program.`,
      };
    }

    throw error;
  }
}

export async function toggleMajorActive(id: string, is_active: boolean): Promise<ServiceResult> {
  await prisma.major.update({
    where: { id },
    data: { is_active },
  });

  return { success: true, data: undefined };
}

export async function deleteMajor(id: string): Promise<ServiceResult> {
  const major = await prisma.major.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          courses: true,
          student_profiles: true,
        },
      },
    },
  });

  if (!major) {
    return { success: false, error: "Major not found." };
  }

  const totalDependents =
    major._count.courses + major._count.student_profiles;

  if (totalDependents > 0) {
    return {
      success: false,
      error: `Cannot delete major "${major.name}" - it has ${totalDependents} dependent record(s). Deactivate it instead.`,
    };
  }

  await prisma.major.delete({ where: { id } });

  return { success: true, data: undefined };
}
