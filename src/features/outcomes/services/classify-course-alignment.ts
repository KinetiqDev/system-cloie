import type { CourseScope } from "@prisma/client";

/**
 * Shared typed-alignment predicate for live readiness and evaluation publication.
 *
 * A CILO is aligned only through the typed relation its Course scope owns:
 * - General Education CILOs require an active Institutional Outcome mapping.
 * - Program-specific CILOs require an active Graduate Outcome mapping owned by
 *   the Course's owning Academic Program.
 *
 * Archived targets and targets from the wrong typed relation never satisfy
 * alignment, regardless of any historical relation elsewhere.
 */

export type CourseAlignmentTargetLayer = "INSTITUTIONAL_OUTCOME" | "GRADUATE_OUTCOME";

export function targetLayerForScope(courseScope: CourseScope): CourseAlignmentTargetLayer {
  return courseScope === "GENERAL_EDUCATION"
    ? "INSTITUTIONAL_OUTCOME"
    : "GRADUATE_OUTCOME";
}

type CiloAlignmentRow = {
  cilo_mappings: Array<{ go: { program_id: string | null; is_active: boolean } }>;
  cilo_institutional_outcome_mappings: Array<{
    institutional_outcome: { is_active: boolean };
  }>;
};

export function ciloHasValidActiveTarget(
  cilo: CiloAlignmentRow,
  courseScope: CourseScope,
  owningProgramId: string | null
): boolean {
  if (courseScope === "GENERAL_EDUCATION") {
    return cilo.cilo_institutional_outcome_mappings.some(
      ({ institutional_outcome }) => institutional_outcome.is_active
    );
  }
  return cilo.cilo_mappings.some(
    ({ go }) => go.is_active && go.program_id === owningProgramId
  );
}

export type CourseAlignmentState = "ready" | "missing-cilos" | "incomplete-mapping";

export function classifyCourseAlignment(
  cilos: CiloAlignmentRow[],
  courseScope: CourseScope,
  owningProgramId: string | null
): CourseAlignmentState {
  if (cilos.length === 0) return "missing-cilos";
  if (cilos.some((cilo) => !ciloHasValidActiveTarget(cilo, courseScope, owningProgramId))) {
    return "incomplete-mapping";
  }
  return "ready";
}
