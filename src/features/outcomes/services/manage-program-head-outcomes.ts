import { prisma } from "@/lib/db/prisma";
import type { CILOMappingManifestation } from "@prisma/client";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import type { CreateGOInput, UpdateGOInput } from "../schemas/go";

import { type ServiceResult } from "@/lib/utils/service-result";
import { ciloIsAligned } from "./classify-course-alignment";
import { commitOutcomeWrite, prepareOutcomeWrite } from "./manage-outcome-writes";

async function writeProgramHeadOutcome(
  input: Parameters<typeof prepareOutcomeWrite>[0]
): Promise<ServiceResult<{ id?: string }>> {
  const review = await prepareOutcomeWrite(input);
  if (!review.success) return review;
  return commitOutcomeWrite(review.data, true);
}

// ─── List GOs ──────────────────────────────────────────────────────────────

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

type ListProgramGOsResult = {
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

// ─── Create GO ─────────────────────────────────────────────────────────────

export async function createGO(input: CreateGOInput): Promise<ServiceResult<{ id: string }>> {
  const contextResult = await resolveProgramHeadContext(input.programId);
  if (!contextResult.success) return contextResult;

  const result = await writeProgramHeadOutcome({ kind: "GO", action: "create", ...input });
  if (!result.success) return result;
  if (!result.data.id) return { success: false, error: "Graduate Outcome was not created." };
  return { success: true, data: { id: result.data.id } };
}
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

// ─── Archive and restore GO ────────────────────────────────────────────────

async function transitionGOArchiveState(
  programId: string,
  id: string,
  action: "archive" | "restore",
  permissionVerb: "delete" | "restore"
): Promise<ServiceResult> {
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
      error: `You do not have permission to ${permissionVerb} this Graduate Outcome.`,
    };
  }

  const result = await writeProgramHeadOutcome({ kind: "GO", action, programId, id });
  if (!result.success) return result;
  return { success: true, data: undefined };
}

export async function deleteGO(programId: string, id: string): Promise<ServiceResult> {
  return transitionGOArchiveState(programId, id, "archive", "delete");
}

export async function restoreGO(programId: string, id: string): Promise<ServiceResult> {
  return transitionGOArchiveState(programId, id, "restore", "restore");
}

// ─── Reorder GOs ───────────────────────────────────────────────────────────

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

export type CourseCILOMappings = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  /** Every active GO of the owning Program; the column catalog for PROGRAM_SPECIFIC courses. */
  gos: Array<{ id: string; code: string; description: string }>;
  /** Archived owning-Program GOs that still carry historical mapping rows in this Course. */
  archivedGos: Array<{ id: string; code: string; description: string }>;
  cilos: Array<{
    id: string;
    description: string;
    readiness: "ready" | "incomplete-mapping";
    /** One entry per active GO for PROGRAM_SPECIFIC courses; null means unanswered. */
    manifestations: Array<{ goId: string; manifestation: CILOMappingManifestation | null }>;
    /** Historical manifestation per archived GO row for PROGRAM_SPECIFIC courses. */
    archivedManifestations: Array<{
      goId: string;
      manifestation: CILOMappingManifestation | null;
    }>;
  }>;
};

export async function listCILOMappingsForProgram(
  programId: string
): Promise<ServiceResult<CourseCILOMappings[]>> {
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) return contextResult;

  const selectedProgramId = contextResult.data.selectedProgram.id;

  // Catalog of active GOs; the exhaustive rule and review matrix both hang off it.
  const [activeGos, courses] = await Promise.all([
    prisma.gO.findMany({
      where: { program_id: selectedProgramId, is_active: true },
      select: { id: true, code: true, description: true },
      orderBy: [{ order: "asc" }, { code: "asc" }],
    }),
    // Find all program-specific courses within this program that have CILOs
    // and are actively assigned to the program this term.
    prisma.course.findMany({
      where: {
        is_active: true,
        cilos: { some: { is_active: true } },
        program_id: selectedProgramId,
        course_assignments: {
          some: {
            program_id: selectedProgramId,
            is_active: true,
            term_instance: { status: "ACTIVE" },
          },
        },
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
                manifestation: true,
                go: {
                  select: {
                    id: true,
                    code: true,
                    description: true,
                    program_id: true,
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
    }),
  ]);

  const result: CourseCILOMappings[] = courses.map((course) => {
    // Archived owning-Program GOs that still carry historical mapping rows in this Course.
    // They stay visible read-only; they never enter the active completeness requirement.
    const archivedGos = [
      ...new Map(
        course.cilos.flatMap((cilo) =>
          cilo.cilo_mappings
            .filter((mapping) => !mapping.go.is_active)
            .map(
              (mapping) =>
                [
                  mapping.go.id,
                  {
                    id: mapping.go.id,
                    code: mapping.go.code,
                    description: mapping.go.description,
                  },
                ] as const
            )
        )
      ).values(),
    ].sort((left, right) => left.code.localeCompare(right.code));
    return {
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      gos: activeGos,
      archivedGos,
      cilos: course.cilos.map((cilo) => {
        const manifestationByGoId = new Map(
          cilo.cilo_mappings.map((mapping) => [mapping.go.id, mapping.manifestation])
        );
        return {
          id: cilo.id,
          description: cilo.description,
          manifestations: activeGos.map((go) => ({
            goId: go.id,
            manifestation: manifestationByGoId.get(go.id) ?? null,
          })),
          archivedManifestations: archivedGos
            .filter((go) => manifestationByGoId.has(go.id))
            .map((go) => ({
              goId: go.id,
              manifestation: manifestationByGoId.get(go.id) ?? null,
            })),
          readiness: ciloIsAligned(
            {
              cilo_mappings: cilo.cilo_mappings.map((mapping) => ({
                manifestation: mapping.manifestation,
                go: {
                  id: mapping.go.id,
                  program_id: mapping.go.program_id,
                  is_active: mapping.go.is_active,
                },
              })),
              cilo_institutional_outcome_mappings: [],
            },
            "PROGRAM_SPECIFIC",
            selectedProgramId,
            activeGos.map((go) => go.id)
          )
            ? "ready"
            : "incomplete-mapping",
        };
      }),
    };
  });

  return { success: true, data: result };
}
