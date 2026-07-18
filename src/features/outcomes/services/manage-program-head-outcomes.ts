import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import type { CreateGOInput, UpdateGOInput } from "../schemas/go";

import { type ServiceResult } from "@/lib/utils/service-result";
import { commitOutcomeWrite, prepareOutcomeWrite } from "./manage-outcome-writes";

async function writeProgramHeadOutcome(
  input: Parameters<typeof prepareOutcomeWrite>[0]
): Promise<ServiceResult<{ id?: string }>> {
  const review = await prepareOutcomeWrite(input);
  if (!review.success) return review;
  return commitOutcomeWrite(review.data, true);
}

async function resolveAndValidatePHScope(
  userId: string
): Promise<ServiceResult<{ programIds: string[] }>> {
  const assignments = await prisma.programHeadAssignment.findMany({
    where: { program_head_id: userId, is_active: true },
    select: { program_id: true },
  });

  const programIds = [...new Set(assignments.map((a) => a.program_id))];

  if (programIds.length === 0) {
    return {
      success: false,
      error: "No active program assignment found for this Program Head.",
    };
  }

  return { success: true, data: { programIds } };
}

// ─── List GOs ────────────────────────────────────────────────────────────────

export type ProgramGOItem = {
  id: string;
  code: string;
  description: string;
  order: number;
  is_active: boolean;
  program_id: string;
  created_at: Date;
  updated_at: Date;
  _count: { cilo_mappings: number };
};

export type ListProgramGOsResult = {
  gos: ProgramGOItem[];
  program: { id: string; code: string; name: string };
};

export async function listProgramGOs(): Promise<ServiceResult<ListProgramGOsResult>> {
  const session = await resolveAuthSession();

  if (!session || !session.roles.includes(ROLES.PROGRAM_HEAD)) {
    return {
      success: false,
      error: "Program Head authentication is required.",
    };
  }

  const scopeResult = await resolveAndValidatePHScope(session.userId);

  if (!scopeResult.success) {
    return scopeResult;
  }

  const { programIds } = scopeResult.data;
  const programId = programIds[0];

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, code: true, name: true },
  });

  if (!program) {
    return { success: false, error: "Assigned program not found." };
  }

  const gos = await prisma.gO.findMany({
    where: { program_id: programId },
    include: {
      _count: {
        select: { cilo_mappings: true },
      },
    },
    orderBy: [{ order: "asc" }, { code: "asc" }],
  });

  return {
    success: true,
    data: { gos, program },
  };
}

// ─── Create GO ───────────────────────────────────────────────────────────────

export async function createGO(input: CreateGOInput): Promise<ServiceResult<{ id: string }>> {
  const session = await resolveAuthSession();

  if (!session || !session.roles.includes(ROLES.PROGRAM_HEAD)) {
    return {
      success: false,
      error: "Program Head authentication is required.",
    };
  }

  const scopeResult = await resolveAndValidatePHScope(session.userId);

  if (!scopeResult.success) {
    return scopeResult;
  }

  const { programIds } = scopeResult.data;
  const programId = programIds[0];

  const result = await writeProgramHeadOutcome({ kind: "GO", action: "create", programId, ...input });
  if (!result.success) return result;
  if (!result.data.id) return { success: false, error: "Graduate Outcome was not created." };
  return { success: true, data: { id: result.data.id } };
}

// ─── Update GO ───────────────────────────────────────────────────────────────

export async function updateGO(input: UpdateGOInput): Promise<ServiceResult<{ id: string }>> {
  const session = await resolveAuthSession();

  if (!session || !session.roles.includes(ROLES.PROGRAM_HEAD)) {
    return {
      success: false,
      error: "Program Head authentication is required.",
    };
  }

  const scopeResult = await resolveAndValidatePHScope(session.userId);

  if (!scopeResult.success) {
    return scopeResult;
  }

  const { programIds } = scopeResult.data;

  const existingGO = await prisma.gO.findUnique({
    where: { id: input.id },
    select: { id: true, program_id: true },
  });

  if (!existingGO) {
    return { success: false, error: "Graduate Outcome not found." };
  }

  if (!programIds.includes(existingGO.program_id)) {
    return {
      success: false,
      error: "You do not have permission to modify this Graduate Outcome.",
    };
  }

  const result = await writeProgramHeadOutcome({ kind: "GO", action: "update", ...input });
  if (!result.success) return result;
  if (!result.data.id) return { success: false, error: "Graduate Outcome was not updated." };
  return { success: true, data: { id: result.data.id } };
}

// ─── Delete GO ───────────────────────────────────────────────────────────────

export async function deleteGO(id: string): Promise<ServiceResult> {
  const session = await resolveAuthSession();

  if (!session || !session.roles.includes(ROLES.PROGRAM_HEAD)) {
    return {
      success: false,
      error: "Program Head authentication is required.",
    };
  }

  const scopeResult = await resolveAndValidatePHScope(session.userId);

  if (!scopeResult.success) {
    return scopeResult;
  }

  const { programIds } = scopeResult.data;

  const existingGO = await prisma.gO.findUnique({ where: { id }, select: { id: true, program_id: true } });

  if (!existingGO) {
    return { success: false, error: "Graduate Outcome not found." };
  }

  if (!programIds.includes(existingGO.program_id)) {
    return {
      success: false,
      error: "You do not have permission to delete this Graduate Outcome.",
    };
  }

  const result = await writeProgramHeadOutcome({ kind: "GO", action: "archive", id });
  if (!result.success) return result;
  return { success: true, data: undefined };
}

// ─── Reorder GOs ─────────────────────────────────────────────────────────────

export async function reorderGOs(orderedIds: string[]): Promise<ServiceResult> {
  const session = await resolveAuthSession();

  if (!session || !session.roles.includes(ROLES.PROGRAM_HEAD)) {
    return {
      success: false,
      error: "Program Head authentication is required.",
    };
  }

  const scopeResult = await resolveAndValidatePHScope(session.userId);

  if (!scopeResult.success) {
    return scopeResult;
  }

  const { programIds } = scopeResult.data;

  const result = await writeProgramHeadOutcome({ kind: "GO", action: "reorder", programId: programIds[0], orderedIds });
  if (!result.success) return result;
  return { success: true, data: undefined };
}

// ─── List CILO Mappings for Program ──────────────────────────────────────────

export type CILOMappingItem = {
  id: string;
  description: string;
  go: { id: string; code: string; description: string };
};

export type CourseCILOMappings = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  cilos: Array<{
    id: string;
    description: string;
    mappedGOs: Array<{ id: string; code: string; description: string }>;
  }>;
};

export async function listCILOMappingsForProgram(): Promise<ServiceResult<CourseCILOMappings[]>> {
  const session = await resolveAuthSession();

  if (!session || !session.roles.includes(ROLES.PROGRAM_HEAD)) {
    return {
      success: false,
      error: "Program Head authentication is required.",
    };
  }

  const scopeResult = await resolveAndValidatePHScope(session.userId);

  if (!scopeResult.success) {
    return scopeResult;
  }

  const { programIds } = scopeResult.data;
  const programId = programIds[0];

  // Find all courses within this program that have CILOs
  const courses = await prisma.course.findMany({
    where: {
      program_id: programId,
      cilos: { some: { is_active: true } },
    },
    select: {
      id: true,
      code: true,
      title: true,
      cilos: {
        where: { is_active: true },
        select: {
          id: true,
          description: true,
          cilo_mappings: {
            select: {
              go: {
                select: {
                  id: true,
                  code: true,
                  description: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: "asc" },
      },
    },
    orderBy: { code: "asc" },
  });

  const result: CourseCILOMappings[] = courses.map((course) => ({
    courseId: course.id,
    courseCode: course.code,
    courseTitle: course.title,
    cilos: course.cilos.map((cilo) => ({
      id: cilo.id,
      description: cilo.description,
      mappedGOs: cilo.cilo_mappings.map((mapping) => ({
        id: mapping.go.id,
        code: mapping.go.code,
        description: mapping.go.description,
      })),
    })),
  }));

  return { success: true, data: result };
}
