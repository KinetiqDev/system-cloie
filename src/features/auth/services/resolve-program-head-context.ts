import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import type { ServiceResult } from "@/lib/utils/service-result";
import { resolveAuthSession } from "./resolve-auth-session";

export type ProgramHeadProgram = {
  id: string;
  code: string;
  name: string;
};

export type ProgramHeadContext = {
  userId: string;
  authorizedPrograms: ProgramHeadProgram[];
  selectedProgram: ProgramHeadProgram;
};

export type ProgramHeadEntry = {
  userId: string;
  authorizedPrograms: ProgramHeadProgram[];
};

const programIdSchema = z.string().uuid();

function failure(error: string): ServiceResult<never> {
  return { success: false, error };
}

function sortPrograms(programs: ProgramHeadProgram[]): ProgramHeadProgram[] {
  return [...programs].sort(
    (left, right) => left.code.localeCompare(right.code) || left.id.localeCompare(right.id)
  );
}

function toProgramHeadProgram(program: {
  id: string;
  code: string;
  name: string;
}): ProgramHeadProgram {
  return { id: program.id, code: program.code, name: program.name };
}

async function resolveAuthorizedPrograms(userId: string): Promise<ProgramHeadProgram[]> {
  const assignments = await prisma.programHeadAssignment.findMany({
    where: { program_head_id: userId, is_active: true },
    select: {
      program: { select: { id: true, code: true, name: true } },
    },
  });

  const programs = new Map<string, ProgramHeadProgram>();
  for (const assignment of assignments) {
    programs.set(assignment.program.id, toProgramHeadProgram(assignment.program));
  }

  return sortPrograms([...programs.values()]);
}

async function resolveProgramHeadUser(): Promise<ServiceResult<{ userId: string }>> {
  const session = await resolveAuthSession();

  if (!session) {
    return failure("Authentication is required.");
  }

  if (session.activeRole !== ROLES.PROGRAM_HEAD) {
    return failure("Program Head role is required.");
  }

  return { success: true, data: { userId: session.userId } };
}

export async function resolveProgramHeadEntry(): Promise<ServiceResult<ProgramHeadEntry>> {
  const userResult = await resolveProgramHeadUser();

  if (!userResult.success) {
    return userResult;
  }

  return {
    success: true,
    data: {
      userId: userResult.data.userId,
      authorizedPrograms: await resolveAuthorizedPrograms(userResult.data.userId),
    },
  };
}

export async function resolveProgramHeadContext(
  programId: string
): Promise<ServiceResult<ProgramHeadContext>> {
  if (!programIdSchema.safeParse(programId).success) {
    return failure("Invalid Program ID.");
  }

  const entryResult = await resolveProgramHeadEntry();
  if (!entryResult.success) {
    return entryResult;
  }

  const selectedProgram = entryResult.data.authorizedPrograms.find(
    (program) => program.id === programId
  );

  if (!selectedProgram) {
    return failure("Selected Program is not assigned.");
  }

  return {
    success: true,
    data: {
      userId: entryResult.data.userId,
      authorizedPrograms: entryResult.data.authorizedPrograms,
      selectedProgram,
    },
  };
}

export async function revalidateProgramHeadAssignment(
  tx: Prisma.TransactionClient,
  input: { userId: string; programId: string }
): Promise<ProgramHeadProgram | null> {
  if (!programIdSchema.safeParse(input.programId).success) {
    return null;
  }

  const assignments = await tx.$queryRaw<Array<{ is_active: boolean; program_id: string }>>`
    SELECT is_active, program_id
    FROM program_head_assignments
    WHERE program_head_id = ${input.userId}::uuid
      AND program_id = ${input.programId}::uuid
    FOR UPDATE
  `;
  const assignment = assignments[0];

  if (!assignment?.is_active) {
    return null;
  }

  const program = await tx.program.findUnique({
    where: { id: assignment.program_id },
    select: { id: true, code: true, name: true },
  });

  return program ? toProgramHeadProgram(program) : null;
}
