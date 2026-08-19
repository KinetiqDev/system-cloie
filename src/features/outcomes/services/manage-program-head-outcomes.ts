import { prisma } from "@/lib/db/prisma";
import type { CourseScope } from "@prisma/client";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import type { CreatePLOInput, UpdatePLOInput } from "../schemas/plo";

import { type ServiceResult } from "@/lib/utils/service-result";
import { commitOutcomeWrite, prepareOutcomeWrite } from "./manage-outcome-writes";

async function writeProgramHeadOutcome(
  input: Parameters<typeof prepareOutcomeWrite>[0]
): Promise<ServiceResult<{ id?: string }>> {
  const review = await prepareOutcomeWrite(input);
  if (!review.success) return review;
  return commitOutcomeWrite(review.data, true);
}

// ─── List PLOs ──────────────────────────────────────────────────────────────

export type ProgramPLOItem = {
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

type ListProgramPLOsResult = {
  plos: ProgramPLOItem[];
  program: { id: string; code: string; name: string };
};

export async function listProgramPLOs(
  programId: string
): Promise<ServiceResult<ListProgramPLOsResult>> {
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

  const plos = await prisma.pLO.findMany({
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
    data: { plos, program },
  };
}

// ─── Create PLO ─────────────────────────────────────────────────────────────

export async function createPLO(input: CreatePLOInput): Promise<ServiceResult<{ id: string }>> {
  const contextResult = await resolveProgramHeadContext(input.programId);
  if (!contextResult.success) return contextResult;

  const result = await writeProgramHeadOutcome({ kind: "PLO", action: "create", ...input });
  if (!result.success) return result;
  if (!result.data.id) return { success: false, error: "Program Learning Outcome was not created." };
  return { success: true, data: { id: result.data.id } };
}

// ─── Update PLO ─────────────────────────────────────────────────────────────

export async function updatePLO(input: UpdatePLOInput): Promise<ServiceResult<{ id: string }>> {
  const contextResult = await resolveProgramHeadContext(input.programId);
  if (!contextResult.success) return contextResult;

  const existingPLO = await prisma.pLO.findUnique({
    where: { id: input.id },
    select: { id: true, program_id: true },
  });

  if (!existingPLO) {
    return { success: false, error: "Program Learning Outcome not found." };
  }

  if (input.programId !== existingPLO.program_id) {
    return {
      success: false,
      error: "You do not have permission to modify this Program Learning Outcome.",
    };
  }

  const result = await writeProgramHeadOutcome({ kind: "PLO", action: "update", ...input });
  if (!result.success) return result;
  if (!result.data.id) return { success: false, error: "Program Learning Outcome was not updated." };
  return { success: true, data: { id: result.data.id } };
}

// ─── Delete PLO ─────────────────────────────────────────────────────────────

async function transitionPLOArchiveState(
  programId: string,
  id: string,
  action: "archive" | "restore",
  permissionVerb: "delete" | "restore"
): Promise<ServiceResult> {
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) return contextResult;

  const existingPLO = await prisma.pLO.findUnique({
    where: { id },
    select: { id: true, program_id: true },
  });

  if (!existingPLO) {
    return { success: false, error: "Program Learning Outcome not found." };
  }

  if (programId !== existingPLO.program_id) {
    return {
      success: false,
      error: `You do not have permission to ${permissionVerb} this Program Learning Outcome.`,
    };
  }

  const result = await writeProgramHeadOutcome({ kind: "PLO", action, programId, id });
  if (!result.success) return result;
  return { success: true, data: undefined };
}

export async function deletePLO(programId: string, id: string): Promise<ServiceResult> {
  return transitionPLOArchiveState(programId, id, "archive", "delete");
}

// ─── Restore PLO ────────────────────────────────────────────────────────────

export async function restorePLO(programId: string, id: string): Promise<ServiceResult> {
  return transitionPLOArchiveState(programId, id, "restore", "restore");
}

// ─── Reorder PLOs ───────────────────────────────────────────────────────────

export async function reorderPLOs(programId: string, orderedIds: string[]): Promise<ServiceResult> {
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) return contextResult;

  const result = await writeProgramHeadOutcome({
    kind: "PLO",
    action: "reorder",
    programId,
    orderedIds,
  });
  if (!result.success) return result;
  return { success: true, data: undefined };
}

// ─── List CILO Mappings for Program ──────────────────────────────────────────

type ProgramMappedTarget = {
  id: string;
  mappingId: string;
  code: string;
  description: string;
  kind: "PLO" | "ILO";
  is_active: boolean;
};

export type CourseCILOMappings = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  courseScope: CourseScope;
  cilos: Array<{
    id: string;
    description: string;
    mappedTargets: ProgramMappedTarget[];
    readiness: "ready" | "incomplete-mapping";
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
      is_active: true,
      cilos: { some: { is_active: true } },
      OR: [
        {
          program_id: selectedProgramId,
          course_assignments: {
            some: {
              program_id: selectedProgramId,
              is_active: true,
              term_instance: { status: "ACTIVE" },
            },
          },
        },
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
      course_scope: true,
      cilos: {
        where: { is_active: true },
        select: {
          id: true,
          description: true,
          cilo_mappings: {
            where: { plo: { program_id: selectedProgramId } },
            select: {
              id: true,
              plo: {
                select: {
                  id: true,
                  code: true,
                  description: true,
                  is_active: true,
                },
              },
            },
          },
          cilo_institutional_outcome_mappings: {
            select: {
              id: true,
              institutional_outcome: {
                select: {
                  id: true,
                  code: true,
                  description: true,
                  is_active: true,
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

  const result: CourseCILOMappings[] = courses.map((course) => {
    const courseScope =
      course.course_scope === "GENERAL_EDUCATION" ? "GENERAL_EDUCATION" : "PROGRAM_SPECIFIC";
    return {
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      courseScope,
      cilos: course.cilos.map((cilo) => {
        const mappedTargets: ProgramMappedTarget[] =
          courseScope === "GENERAL_EDUCATION"
            ? cilo.cilo_institutional_outcome_mappings.map((mapping) => ({
                id: mapping.institutional_outcome.id,
                mappingId: mapping.id,
                code: mapping.institutional_outcome.code,
                description: mapping.institutional_outcome.description,
                kind: "ILO",
                is_active: mapping.institutional_outcome.is_active,
              }))
: cilo.cilo_mappings.map((mapping) => ({
                id: mapping.plo.id,
                mappingId: mapping.id,
                code: mapping.plo.code,
                description: mapping.plo.description,
                kind: "PLO",
                is_active: mapping.plo.is_active,
              }));
        return {
          id: cilo.id,
          description: cilo.description,
          mappedTargets,
          readiness: mappedTargets.some((target) => target.is_active)
            ? "ready"
            : "incomplete-mapping",
        };
      }),
    };
  });

  return { success: true, data: result };
}
