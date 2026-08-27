import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import type {
  CreateMajorInput,
  CreateProgramInput,
  UpdateMajorInput,
  UpdateProgramInput,
} from "../schemas/program";

import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

export type ProgramDependencyCounts = {
  academicSetup: { majors: number; courses: number; plos: number };
  peopleAndHistory: { studentProfiles: number; enrollments: number; alumniProfiles: number };
  teaching: {
    courseAssignments: number;
    facultyAffiliations: number;
    programHeadAssignments: number;
  };
  evaluation: {
    evaluationTargets: number;
    centralDeployments: number;
    instrumentTemplates: number;
  };
  externalLinks: { stakeholderInvites: number; industryPartnerProfiles: number };
};

export type ProgramDeletionPreflight = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  revision: string;
  blockers: { inactive: boolean; linkedRecords: boolean };
  dependencies: ProgramDependencyCounts;
};

function hasDependencies(dependencies: ProgramDependencyCounts) {
  return Object.values(dependencies).some((group) =>
    Object.values(group).some((count) => count > 0)
  );
}

async function countProgramDependencies(
  db: typeof prisma | Prisma.TransactionClient,
  programId: string
): Promise<ProgramDependencyCounts> {
  const [
    majors,
    courses,
    plos,
    studentProfiles,
    enrollments,
    alumniProfiles,
    courseAssignments,
    facultyAffiliations,
    programHeadAssignments,
    evaluationTargets,
    centralDeployments,
    templatesByProgram,
    templatesByBoundProgram,
    stakeholderInvites,
    industryPartnerProfiles,
    industryPartnerAffs,
  ] = await Promise.all([
    db.major.count({ where: { program_id: programId } }),
    db.course.count({ where: { program_id: programId } }),
    db.pLO.count({ where: { program_id: programId } }),
    db.studentAcademicProfile.count({ where: { program_id: programId } }),
    db.studentEnrollment.count({ where: { program_id: programId } }),
    db.alumniProfile.count({ where: { program_id: programId } }),
    db.courseAssignment.count({ where: { program_id: programId } }),
    db.facultyProgramAffiliation.count({ where: { program_id: programId } }),
    db.programHeadAssignment.count({ where: { program_id: programId } }),
    db.courseBoundEvaluationTarget.count({ where: { program_id: programId } }),
    db.centralDeployment.count({ where: { program_id: programId } }),
    db.instrumentTemplate.count({ where: { program_id: programId } }),
    db.instrumentTemplate.count({ where: { bound_program_id: programId } }),
    db.externalStakeholderInvite.count({ where: { program_id: programId } }),
    db.industryPartnerProfile.count({ where: { program_id: programId } }),
    db.industryPartnerProgramAffiliation.count({ where: { program_id: programId } }),
  ]);

  const overlappingTemplates = await db.instrumentTemplate.count({
    where: { program_id: programId, bound_program_id: programId },
  });

  return {
    academicSetup: { majors, courses, plos },
    peopleAndHistory: { studentProfiles, enrollments, alumniProfiles },
    teaching: { courseAssignments, facultyAffiliations, programHeadAssignments },
    evaluation: {
      evaluationTargets,
      centralDeployments,
      instrumentTemplates: templatesByProgram + templatesByBoundProgram - overlappingTemplates,
    },
    externalLinks: {
      stakeholderInvites,
      industryPartnerProfiles: industryPartnerProfiles + industryPartnerAffs,
    },
  };
}

function toPreflight(
  program: { id: string; code: string; name: string; is_active: boolean; updated_at: Date },
  dependencies: ProgramDependencyCounts
): ProgramDeletionPreflight {
  return {
    id: program.id,
    code: program.code,
    name: program.name,
    isActive: program.is_active,
    revision: program.updated_at.toISOString(),
    blockers: { inactive: program.is_active, linkedRecords: hasDependencies(dependencies) },
    dependencies,
  };
}

export async function preflightProgramDeletion(
  id: string
): Promise<ServiceResult<ProgramDeletionPreflight>> {
  const program = await prisma.program.findUnique({ where: { id } });
  if (!program) return { success: false, error: "Program not found." };

  return {
    success: true,
    data: toPreflight(program, await countProgramDependencies(prisma, id)),
  };
}

export type DeleteProgramResult =
  | { success: true; data: { id: string } }
  | { success: false; error: string; data?: ProgramDeletionPreflight };

export async function deleteProgram(input: {
  id: string;
  confirmationCode: string;
  revision: string;
}): Promise<DeleteProgramResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const program = await tx.program.findUnique({ where: { id: input.id } });
      if (!program) return { success: false, error: "Program not found." };
      if (program.is_active)
        return { success: false, error: "Program must be inactive before deletion." };

      const guardedRevision = await tx.program.updateMany({
        where: {
          id: input.id,
          is_active: false,
          updated_at: new Date(input.revision),
        },
        data: { updated_at: program.updated_at },
      });
      if (guardedRevision.count !== 1)
        return { success: false, error: "Program changed after preflight." };

      const dependencies = await countProgramDependencies(tx, input.id);
      const current = toPreflight(program, dependencies);
      if (hasDependencies(dependencies))
        return { success: false, error: "Program has linked records.", data: current };
      if (input.confirmationCode.trim() !== program.code)
        return { success: false, error: "Program code confirmation does not match." };

      await tx.program.delete({ where: { id: input.id } });
      return { success: true, data: { id: input.id } };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      const refreshed = await preflightProgramDeletion(input.id);
      if (refreshed.success)
        return { success: false, error: "Program gained linked records.", data: refreshed.data };
      return refreshed;
    }
    throw error;
  }
}

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
          plos: true,
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
          plos: true,
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

export async function toggleProgramActive(
  id: string,
  is_active: boolean,
  expectedIsActive = !is_active
): Promise<ServiceResult> {
  const result = await prisma.program.updateMany({
    where: { id, is_active: expectedIsActive },
    data: { is_active },
  });

  if (result.count !== 1) return { success: false, error: "Program status changed elsewhere." };

  return { success: true, data: undefined };
}

export async function setProgramActive(id: string, isActive: boolean): Promise<ServiceResult> {
  const result = await prisma.program.updateMany({
    where: { id },
    data: { is_active: isActive },
  });
  if (result.count !== 1) return { success: false, error: "Program not found." };
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

  const totalDependents = major._count.courses + major._count.student_profiles;

  if (totalDependents > 0) {
    return {
      success: false,
      error: `Cannot delete major "${major.name}" - it has ${totalDependents} dependent record(s). Deactivate it instead.`,
    };
  }

  await prisma.major.delete({ where: { id } });

  return { success: true, data: undefined };
}
