import { prisma } from "@/lib/db/prisma";
import type { CILOMappingManifestation } from "@prisma/client";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import type { CreatePOInput, UpdatePOInput } from "../schemas/po";

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

// ─── List POs ──────────────────────────────────────────────────────────────

export type ProgramPOItem = {
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

type ListProgramPOsResult = {
  pos: ProgramPOItem[];
  program: { id: string; code: string; name: string };
};
export async function listProgramPOs(
  programId: string
): Promise<ServiceResult<ListProgramPOsResult>> {
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

  const pos = await prisma.pO.findMany({
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
    data: { pos, program },
  };
}

// ─── Create PO ─────────────────────────────────────────────────────────────

export async function createPO(input: CreatePOInput): Promise<ServiceResult<{ id: string }>> {
  const contextResult = await resolveProgramHeadContext(input.programId);
  if (!contextResult.success) return contextResult;

  const result = await writeProgramHeadOutcome({ kind: "PO", action: "create", ...input });
  if (!result.success) return result;
  if (!result.data.id) return { success: false, error: "Program Outcome was not created." };
  return { success: true, data: { id: result.data.id } };
}
export async function updatePO(input: UpdatePOInput): Promise<ServiceResult<{ id: string }>> {
  const contextResult = await resolveProgramHeadContext(input.programId);
  if (!contextResult.success) return contextResult;

  const existingPO = await prisma.pO.findUnique({
    where: { id: input.id },
    select: { id: true, program_id: true },
  });

  if (!existingPO) {
    return { success: false, error: "Program Outcome not found." };
  }

  if (input.programId !== existingPO.program_id) {
    return {
      success: false,
      error: "You do not have permission to modify this Program Outcome.",
    };
  }

  const result = await writeProgramHeadOutcome({ kind: "PO", action: "update", ...input });
  if (!result.success) return result;
  if (!result.data.id) return { success: false, error: "Program Outcome was not updated." };
  return { success: true, data: { id: result.data.id } };
}

// ─── Archive and restore PO ────────────────────────────────────────────────

async function transitionPOArchiveState(
  programId: string,
  id: string,
  action: "archive" | "restore",
  permissionVerb: "delete" | "restore"
): Promise<ServiceResult> {
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) return contextResult;

  const existingPO = await prisma.pO.findUnique({
    where: { id },
    select: { id: true, program_id: true },
  });

  if (!existingPO) {
    return { success: false, error: "Program Outcome not found." };
  }

  if (programId !== existingPO.program_id) {
    return {
      success: false,
      error: `You do not have permission to ${permissionVerb} this Program Outcome.`,
    };
  }

  const result = await writeProgramHeadOutcome({ kind: "PO", action, programId, id });
  if (!result.success) return result;
  return { success: true, data: undefined };
}

export async function deletePO(programId: string, id: string): Promise<ServiceResult> {
  return transitionPOArchiveState(programId, id, "archive", "delete");
}

export async function restorePO(programId: string, id: string): Promise<ServiceResult> {
  return transitionPOArchiveState(programId, id, "restore", "restore");
}

// ─── Reorder POs ───────────────────────────────────────────────────────────

export async function reorderPOs(programId: string, orderedIds: string[]): Promise<ServiceResult> {
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) return contextResult;

  const result = await writeProgramHeadOutcome({
    kind: "PO",
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
  /** Every active PO of the owning Program; the column catalog for PROGRAM_SPECIFIC courses. */
  pos: Array<{ id: string; code: string; description: string }>;
  /** Archived owning-Program POs that still carry historical mapping rows in this Course. */
  archivedGos: Array<{ id: string; code: string; description: string }>;
  cilos: Array<{
    id: string;
    description: string;
    readiness: "ready" | "incomplete-mapping";
    /** One entry per active PO for PROGRAM_SPECIFIC courses; null means unanswered. */
    manifestations: Array<{ poId: string; manifestation: CILOMappingManifestation | null }>;
    /** Historical manifestation per archived PO row for PROGRAM_SPECIFIC courses. */
    archivedManifestations: Array<{
      poId: string;
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

  // Catalog of active POs; the exhaustive rule and review matrix both hang off it.
  const [activeGos, courses] = await Promise.all([
    prisma.pO.findMany({
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
              where: { po: { program_id: selectedProgramId } },
              select: {
                id: true,
                manifestation: true,
                po: {
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
    // Archived owning-Program POs that still carry historical mapping rows in this Course.
    // They stay visible read-only; they never enter the active completeness requirement.
    const archivedGos = [
      ...new Map(
        course.cilos.flatMap((cilo) =>
          cilo.cilo_mappings
            .filter((mapping) => !mapping.po.is_active)
            .map(
              (mapping) =>
                [
                  mapping.po.id,
                  {
                    id: mapping.po.id,
                    code: mapping.po.code,
                    description: mapping.po.description,
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
      pos: activeGos,
      archivedGos,
      cilos: course.cilos.map((cilo) => {
        const manifestationByGoId = new Map(
          cilo.cilo_mappings.map((mapping) => [mapping.po.id, mapping.manifestation])
        );
        return {
          id: cilo.id,
          description: cilo.description,
          manifestations: activeGos.map((po) => ({
            poId: po.id,
            manifestation: manifestationByGoId.get(po.id) ?? null,
          })),
          archivedManifestations: archivedGos
            .filter((po) => manifestationByGoId.has(po.id))
            .map((po) => ({
              poId: po.id,
              manifestation: manifestationByGoId.get(po.id) ?? null,
            })),
          readiness: ciloIsAligned(
            {
              cilo_mappings: cilo.cilo_mappings.map((mapping) => ({
                manifestation: mapping.manifestation,
                po: {
                  id: mapping.po.id,
                  program_id: mapping.po.program_id,
                  is_active: mapping.po.is_active,
                },
              })),
              cilo_institutional_outcome_mappings: [],
            },
            "PROGRAM_SPECIFIC",
            selectedProgramId,
            activeGos.map((po) => po.id)
          )
            ? "ready"
            : "incomplete-mapping",
        };
      }),
    };
  });

  return { success: true, data: result };
}
