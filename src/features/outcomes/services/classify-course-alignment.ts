import type { CILOMappingManifestation, CourseScope, GEAlignmentMode } from "@prisma/client";

export type CourseAlignmentTargetLayer =
  | "INSTITUTIONAL_OUTCOME"
  | "GRADUATE_OUTCOME"
  | "COMMON_PROGRAM_OUTCOME";

export function targetLayerForScope(
  courseScope: CourseScope,
  mode: GEAlignmentMode = "ILO"
): CourseAlignmentTargetLayer {
  return courseScope === "GENERAL_EDUCATION"
    ? mode === "COMMON_PO"
      ? "COMMON_PROGRAM_OUTCOME"
      : "INSTITUTIONAL_OUTCOME"
    : "GRADUATE_OUTCOME";
}

export type CourseAlignmentState = "ready" | "missing-cilos" | "incomplete-mapping";

/**
 * Shared typed-alignment predicate for live readiness and evaluation publication.
 *
 * A CILO is aligned only through the typed relation its Course scope owns:
 * - General Education CILOs require at least one active Institutional Outcome
 *   mapping with a non-null manifestation ("at-least-one" rule).
 * - Program-specific CILOs require a non-null manifestation for EVERY active
 *   Program Outcome owned by the Course's owning Academic Program.
 *   A Program with zero active POs alongside active CILOs is incomplete, not
 *   vacuously ready.
 *
 * Archived targets, wrong-program targets, and rows without a manifestation
 * never satisfy alignment, regardless of any historical relation elsewhere.
 */
type CiloAlignmentRow = {
  cilo_common_po_mappings?: Array<{
    manifestation: CILOMappingManifestation | null;
    common_outcome: { is_active: boolean };
  }>;
  cilo_mappings: Array<{
    manifestation: CILOMappingManifestation | null;
    po: { id: string; program_id: string | null; is_active: boolean };
  }>;
  cilo_institutional_outcome_mappings: Array<{
    manifestation: CILOMappingManifestation | null;
    institutional_outcome: { is_active: boolean };
  }>;
};
export function ciloIsAligned(
  cilo: CiloAlignmentRow,
  courseScope: CourseScope,
  owningProgramId: string | null,
  activeGoIds: string[],
  mode: GEAlignmentMode = "ILO"
): boolean {
  if (courseScope === "GENERAL_EDUCATION") {
    if (mode === "COMMON_PO")
      return (cilo.cilo_common_po_mappings ?? []).some(
        ({ common_outcome, manifestation }) => common_outcome.is_active && manifestation !== null
      );
    return cilo.cilo_institutional_outcome_mappings.some(
      ({ institutional_outcome, manifestation }) =>
        institutional_outcome.is_active && manifestation !== null
    );
  }
  return hasExhaustiveGoCoverage(
    cilo.cilo_mappings
      .filter(
        ({ manifestation, po }) =>
          manifestation !== null && po.is_active && po.program_id === owningProgramId
      )
      .map(({ po }) => po.id),
    activeGoIds
  );
}
/**
 * Exhaustive PO coverage rule shared by live readiness, the publication
 * gate, and snapshot-derived Dean oversight: every active owning-Program PO
 * id must be classified. Zero active POs is NOT vacuously complete — active
 * CILOs require targets, so an empty active set is incomplete.
 */
export function hasExhaustiveGoCoverage(
  classifiedGoIds: Iterable<string>,
  activeGoIds: readonly string[]
): boolean {
  if (activeGoIds.length === 0) return false;
  const classified = new Set(classifiedGoIds);
  return activeGoIds.every((poId) => classified.has(poId));
}
export function classifyCourseAlignment(
  cilos: CiloAlignmentRow[],
  courseScope: CourseScope,
  owningProgramId: string | null,
  activeGoIds: string[],
  mode: GEAlignmentMode = "ILO"
): CourseAlignmentState {
  if (cilos.length === 0) return "missing-cilos";
  if (cilos.some((cilo) => !ciloIsAligned(cilo, courseScope, owningProgramId, activeGoIds, mode))) {
    return "incomplete-mapping";
  }
  return "ready";
}
