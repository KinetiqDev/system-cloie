import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
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

export async function listProgramGOs(
  programId: string
): Promise<ServiceResult<ListProgramGOsResult>> {
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) return contextResult;

  const selectedProgramId = contextResult.data.selectedProgram.id;

  const program = await prisma.program.findUnique({
    where: { id: selectedProgramId },
    select: { id: true, code: true, name: true },
  });

  if (!program) {
    return { success: false, error: "Assigned program not found." };
  }

  const gos = await prisma.gO.findMany({
    where: { program_id: selectedProgramId },
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
  const contextResult = await resolveProgramHeadContext(input.programId);
  if (!contextResult.success) return contextResult;

  const result = await writeProgramHeadOutcome({ kind: "GO", action: "create", ...input });
  if (!result.success) return result;
  if (!result.data.id) return { success: false, error: "Graduate Outcome was not created." };
  return { success: true, data: { id: result.data.id } };
}

// ─── Update GO ───────────────────────────────────────────────────────────────

export async function updateGO(input: UpdateGOInput): Promise<ServiceResult<{ id: string }>> {
  const contextResult = await resolveProgramHeadContext(input.programId);
  if (!contextResult.success) return contextResult;

  const existingGO = await prisma.gO.findUnique({
    where: { id: input.id },
    select: { id: true, program_id: true },
  });

  if (!existingGO) {
    return { success: false, error: "Graduate Outcome not found." };
  }

  if (input.programId !== existingGO.program_id) {
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

export async function deleteGO(programId: string, id: string): Promise<ServiceResult> {
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) return contextResult;

  const existingGO = await prisma.gO.findUnique({
    where: { id },
    select: { id: true, program_id: true },
  });

  if (!existingGO) {
    return { success: false, error: "Graduate Outcome not found." };
  }

  if (programId !== existingGO.program_id) {
    return {
      success: false,
      error: "You do not have permission to delete this Graduate Outcome.",
    };
  }

  const result = await writeProgramHeadOutcome({ kind: "GO", action: "archive", programId, id });
  if (!result.success) return result;
  return { success: true, data: undefined };
}

// ─── Reorder GOs ─────────────────────────────────────────────────────────────

export async function reorderGOs(programId: string, orderedIds: string[]): Promise<ServiceResult> {
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) return contextResult;

  const result = await writeProgramHeadOutcome({
    kind: "GO",
    action: "reorder",
    programId,
    orderedIds,
  });
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
    mappedGOs: Array<{ id: string; mappingId: string; code: string; description: string }>;
  }>;
};

export async function listCILOMappingsForProgram(
  programId: string
): Promise<ServiceResult<CourseCILOMappings[]>> {
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) return contextResult;

  const selectedProgramId = contextResult.data.selectedProgram.id;

  // Find all courses within this program that have CILOs
  const courses = await prisma.course.findMany({
    where: {
      cilos: { some: { is_active: true } },
      OR: [
        { program_id: selectedProgramId },
        {
          course_scope: "GENERAL_EDUCATION",
          course_assignments: {
            some: {
              program_id: selectedProgramId,
              is_active: true,
              term_instance: { status: "ACTIVE" },
            },
          },
        },
      ],
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
            where: { go: { program_id: selectedProgramId } },
            select: {
              id: true,
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
        mappingId: mapping.id,
        code: mapping.go.code,
        description: mapping.go.description,
      })),
    })),
  }));

  return { success: true, data: result };
}
