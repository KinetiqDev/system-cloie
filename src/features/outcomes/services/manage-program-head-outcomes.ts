import { prisma } from "@/lib/db/prisma";
import type { CILOMappingManifestation, CourseScope } from "@prisma/client";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import type { CreatePLOInput, UpdatePLOInput } from "../schemas/plo";

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
  /** Every active PLO of the owning Program; the column catalog for PROGRAM_SPECIFIC courses. */
  plos: Array<{ id: string; code: string; description: string }>;
  /** Archived owning-Program PLOs that still carry historical mapping rows in this Course. */
  archivedPlos: Array<{ id: string; code: string; description: string }>;
  cilos: Array<{
    id: string;
    description: string;
    readiness: "ready" | "incomplete-mapping";
    /** Mapped Institutional Outcomes, populated for GENERAL_EDUCATION courses only. */
    mappedTargets: ProgramMappedTarget[];
    /** One entry per active PLO for PROGRAM_SPECIFIC courses; null means unanswered. */
    manifestations: Array<{ ploId: string; manifestation: CILOMappingManifestation | null }>;
    /** Historical manifestation per archived PLO row for PROGRAM_SPECIFIC courses. */
    archivedManifestations: Array<{
      ploId: string;
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

  // Catalog of active PLOs; the exhaustive rule and review matrix both hang off it.
  const [activePlos, courses] = await Promise.all([
    prisma.pLO.findMany({
      where: { program_id: selectedProgramId, is_active: true },
      select: { id: true, code: true, description: true },
      orderBy: [{ order: "asc" }, { code: "asc" }],
    }),
    // Find all courses within this program that have CILOs
    prisma.course.findMany({
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
              manifestation: true,
              plo: {
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
  }),
  ]);

  const result: CourseCILOMappings[] = courses.map((course) => {
    const courseScope =
      course.course_scope === "GENERAL_EDUCATION" ? "GENERAL_EDUCATION" : "PROGRAM_SPECIFIC";
    // Archived owning-Program PLOs that still carry historical mapping rows in this Course.
    // They stay visible read-only; they never enter the active completeness requirement.
    const archivedPlos =
      courseScope === "PROGRAM_SPECIFIC"
        ? [
            ...new Map(
              course.cilos.flatMap((cilo) =>
                cilo.cilo_mappings
                  .filter((mapping) => !mapping.plo.is_active)
                  .map(
                    (mapping) =>
                      [
                        mapping.plo.id,
                        {
                          id: mapping.plo.id,
                          code: mapping.plo.code,
                          description: mapping.plo.description,
                        },
                      ] as const
                  )
              )
            ).values(),
          ].sort((left, right) => left.code.localeCompare(right.code))
        : [];
    return {
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      courseScope,
      plos: courseScope === "PROGRAM_SPECIFIC" ? activePlos : [],
      archivedPlos,
      cilos: course.cilos.map((cilo) => {
        if (courseScope === "GENERAL_EDUCATION") {
          return {
            id: cilo.id,
            description: cilo.description,
            mappedTargets: cilo.cilo_institutional_outcome_mappings.map((mapping) => ({
              id: mapping.institutional_outcome.id,
              mappingId: mapping.id,
              code: mapping.institutional_outcome.code,
              description: mapping.institutional_outcome.description,
              kind: "ILO",
              is_active: mapping.institutional_outcome.is_active,
            })),
            manifestations: [],
            archivedManifestations: [],
            readiness: ciloIsAligned(
              {
                cilo_mappings: [],
                cilo_institutional_outcome_mappings:
                  cilo.cilo_institutional_outcome_mappings.map((mapping) => ({
                    institutional_outcome: { is_active: mapping.institutional_outcome.is_active },
                  })),
              },
              courseScope,
              null,
              []
            )
              ? "ready"
              : "incomplete-mapping",
          };
        }
        const manifestationByPloid = new Map(
          cilo.cilo_mappings.map((mapping) => [mapping.plo.id, mapping.manifestation])
        );
        return {
          id: cilo.id,
          description: cilo.description,
          mappedTargets: [],
          manifestations: activePlos.map((plo) => ({
            ploId: plo.id,
            manifestation: manifestationByPloid.get(plo.id) ?? null,
          })),
          archivedManifestations: archivedPlos
            .filter((plo) => manifestationByPloid.has(plo.id))
            .map((plo) => ({
              ploId: plo.id,
              manifestation: manifestationByPloid.get(plo.id) ?? null,
            })),
          readiness: ciloIsAligned(
            {
              cilo_mappings: cilo.cilo_mappings.map((mapping) => ({
                manifestation: mapping.manifestation,
                plo: {
                  id: mapping.plo.id,
                  program_id: mapping.plo.program_id,
                  is_active: mapping.plo.is_active,
                },
              })),
              cilo_institutional_outcome_mappings: [],
            },
            courseScope,
            selectedProgramId,
            activePlos.map((plo) => plo.id)
          )
            ? "ready"
            : "incomplete-mapping",
        };
      }),
    };
  });

  return { success: true, data: result };
}
