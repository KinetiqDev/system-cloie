import type { CILOMappingManifestation, CourseScope } from "@prisma/client";

export type CourseAlignmentTargetLayer = "INSTITUTIONAL_OUTCOME" | "GRADUATE_OUTCOME";

export function targetLayerForScope(courseScope: CourseScope): CourseAlignmentTargetLayer {
  return courseScope === "GENERAL_EDUCATION" ? "INSTITUTIONAL_OUTCOME" : "GRADUATE_OUTCOME";
}

export type CourseAlignmentState = "ready" | "missing-cilos" | "incomplete-mapping";

/**
 * Shared typed-alignment predicate for live readiness and evaluation publication.
 *
 * A CILO is aligned only through the typed relation its Course scope owns:
 * - General Education CILOs require at least one active Institutional Outcome
 *   mapping with a non-null manifestation ("at-least-one" rule).
 * - Program-specific CILOs require a non-null manifestation for EVERY active
 *   Graduate Outcome owned by the Course's owning Academic Program.
 *   A Program with zero active GOs alongside active CILOs is incomplete, not
 *   vacuously ready.
 *
 * Archived targets, wrong-program targets, and rows without a manifestation
 * never satisfy alignment, regardless of any historical relation elsewhere.
 */
type CiloAlignmentRow = {
  cilo_mappings: Array<{
    manifestation: CILOMappingManifestation | null;
    go: { id: string; program_id: string | null; is_active: boolean };
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
  activeGoIds: string[]
): boolean {
  if (courseScope === "GENERAL_EDUCATION") {
    return cilo.cilo_institutional_outcome_mappings.some(
      ({ institutional_outcome, manifestation }) =>
        institutional_outcome.is_active && manifestation !== null
    );
  }
  return hasExhaustiveGoCoverage(
    cilo.cilo_mappings
      .filter(
        ({ manifestation, go }) =>
          manifestation !== null && go.is_active && go.program_id === owningProgramId
      )
      .map(({ go }) => go.id),
    activeGoIds
  );
}
/**
 * Exhaustive GO coverage rule shared by live readiness, the publication
 * gate, and snapshot-derived Dean oversight: every active owning-Program GO
 * id must be classified. Zero active GOs is NOT vacuously complete — active
 * CILOs require targets, so an empty active set is incomplete.
 */
export function hasExhaustiveGoCoverage(
  classifiedGoIds: Iterable<string>,
  activeGoIds: readonly string[]
): boolean {
  if (activeGoIds.length === 0) return false;
  const classified = new Set(classifiedGoIds);
  return activeGoIds.every((goId) => classified.has(goId));
}
export function classifyCourseAlignment(
  cilos: CiloAlignmentRow[],
  courseScope: CourseScope,
  owningProgramId: string | null,
  activeGoIds: string[]
): CourseAlignmentState {
  if (cilos.length === 0) return "missing-cilos";
  if (cilos.some((cilo) => !ciloIsAligned(cilo, courseScope, owningProgramId, activeGoIds))) {
    return "incomplete-mapping";
  }
  return "ready";
}
