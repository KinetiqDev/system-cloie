import type { CILOMappingManifestation, CourseScope } from "@prisma/client";

/**
 * Shared typed-alignment predicate for live readiness and evaluation publication.
 *
 * A CILO is aligned only through the typed relation its Course scope owns:
 * - General Education CILOs require at least one active Institutional Outcome
 *   mapping ("at-least-one" rule, unchanged).
 * - Program-specific CILOs require a non-null manifestation for EVERY active
 *   Program Learning Outcome owned by the Course's owning Academic Program.
 *   A Program with zero active PLOs alongside active CILOs is incomplete, not
 *   vacuously ready.
 *
 * Archived targets, wrong-program targets, and rows without a manifestation
 * never satisfy alignment, regardless of any historical relation elsewhere.
 */

export type CourseAlignmentTargetLayer = "INSTITUTIONAL_OUTCOME" | "GRADUATE_OUTCOME";

export function targetLayerForScope(courseScope: CourseScope): CourseAlignmentTargetLayer {
  return courseScope === "GENERAL_EDUCATION"
    ? "INSTITUTIONAL_OUTCOME"
    : "GRADUATE_OUTCOME";
}

type CiloAlignmentRow = {
  cilo_mappings: Array<{
    manifestation: CILOMappingManifestation | null;
    plo: { id: string; program_id: string | null; is_active: boolean };
  }>;
  cilo_institutional_outcome_mappings: Array<{
    institutional_outcome: { is_active: boolean };
  }>;
};

export function ciloIsAligned(
  cilo: CiloAlignmentRow,
  courseScope: CourseScope,
  owningProgramId: string | null,
  activePloIds: string[]
): boolean {
  if (courseScope === "GENERAL_EDUCATION") {
    return cilo.cilo_institutional_outcome_mappings.some(
      ({ institutional_outcome }) => institutional_outcome.is_active
    );
  }
  return hasExhaustivePloCoverage(
    cilo.cilo_mappings
      .filter(
        ({ manifestation, plo }) =>
          manifestation !== null && plo.is_active && plo.program_id === owningProgramId
      )
      .map(({ plo }) => plo.id),
    activePloIds
  );
}

export type CourseAlignmentState = "ready" | "missing-cilos" | "incomplete-mapping";

/**
 * Exhaustive PLO coverage rule shared by live readiness, the publication
 * gate, and snapshot-derived Dean oversight: every active owning-Program PLO
 * id must be classified. Zero active PLOs is NOT vacuously complete — active
 * CILOs require targets, so an empty active set is incomplete.
 */
export function hasExhaustivePloCoverage(
  classifiedPloIds: Iterable<string>,
  activePloIds: readonly string[]
): boolean {
  if (activePloIds.length === 0) return false;
  const classified = new Set(classifiedPloIds);
  return activePloIds.every((ploId) => classified.has(ploId));
}

export function classifyCourseAlignment(
  cilos: CiloAlignmentRow[],
  courseScope: CourseScope,
  owningProgramId: string | null,
  activePloIds: string[]
): CourseAlignmentState {
  if (cilos.length === 0) return "missing-cilos";
  if (
    cilos.some((cilo) => !ciloIsAligned(cilo, courseScope, owningProgramId, activePloIds))
  ) {
    return "incomplete-mapping";
  }
  return "ready";
}