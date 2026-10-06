import type { MetricEvidenceSummary } from "./aggregators/types";

/** One category of a scale-resolved Likert distribution. */
export type OutcomeCategoryDTO = {
  value: number;
  label: string | null;
  count: number;
  /** Full-precision share of the scale group; round only for display. */
  percentage: number;
};

/**
 * A Likert distribution for one instrument-version scale identity. Scales are
 * never merged: each distinct frozen descriptor set produces its own group.
 */
export type OutcomeScaleDistributionDTO = {
  /** Readable scale summary, e.g. "1–5 (5-point)"; labels come from the frozen snapshot. */
  scaleLabel: string;
  /** Highest descriptor value on this scale, so charts can size a shared axis. */
  maxValue: number;
  categories: OutcomeCategoryDTO[];
};

type ContributorCourse = { id: string; code: string; title: string } | null;

/** One valid-rating contribution behind an outcome evidence row. */
export type OutcomeContributorDTO =
  | {
      kind: "CILO";
      ciloId: string;
      /** Publication-time `CILO n` label within the contributor's course. */
      ciloCode: string;
      ciloDescription: string;
      /** Course behind the contribution; null when the course record is gone. */
      course: ContributorCourse;
      manifestation: "LEARNING" | "PRACTICE" | "OPPORTUNITY" | null;
      meanRating: number;
      ratingCount: number;
    }
  | {
      kind: "DIRECT";
      evaluationId: string;
      deploymentName: string;
      sectionKey: string;
      itemKey: string;
      questionPrompt: string;
      course: ContributorCourse;
      meanRating: number;
      ratingCount: number;
    };

/**
 * One outcome evidence row (Graduate Outcome or Institutional Learning
 * Outcome). Mean retains full precision; rating count is distinct from
 * submitted response count.
 */
export type OutcomeEvidenceDTO = {
  outcomeId: string;
  code: string;
  name: string;
  /** Full-precision mean of valid ratings; null when the row has no valid ratings. */
  meanRating: number | null;
  /** Count of valid in-scale ratings reaching this outcome. */
  ratingCount: number;
  /** Distinct submitted responses that contributed valid ratings to this outcome. */
  submittedResponseCount: number;
  /** CILOs that contributed ratings to this row. */
  contributingCilos: Array<{ id: string; description: string }>;
  /** Courses whose course-bound evidence contributed to this row. */
  contributingCourses: Array<{ id: string; code: string; title: string }>;
  /** Valid-rating contributors behind this row, preserving CILO or direct-question provenance. */
  contributors: OutcomeContributorDTO[];
  /**
   * Course-bound evaluations behind this row. Links resolve to the owning
   * role's review route, which independently re-authorizes before exposing
   * any raw response text.
   */
  evidenceEvaluations: Array<{ evaluationId: string; deploymentName: string }>;
  /** Scale-separated Likert distributions resolved from frozen structure snapshots. */
  distributions: OutcomeScaleDistributionDTO[];
  /**
   * True when the pooled mean combines ratings from more than one distinct
   * instrument-version scale identity; the UI discloses that cross-scale
   * values are not directly comparable.
   */
  spansMultipleScales: boolean;
  /** Ratings excluded from the valid aggregate (unresolvable or out-of-scale values). */
  excludedRatingCount: number;
  /** Presentation metadata for the "How calculated" disclosure (§41). */
  evidenceSummary: MetricEvidenceSummary;
};

/** Presentation vocabulary for one outcome layer. */
export type OutcomeLayerLabels = {
  /** Singular full name, e.g. "Graduate Outcome". */
  singular: string;
  /** Short name used in compact headings, e.g. "GO". */
  short: string;
};

export const GRADUATE_OUTCOME_LABELS: OutcomeLayerLabels = {
  singular: "Graduate Outcome",
  short: "GO",
};

export const INSTITUTIONAL_OUTCOME_LABELS: OutcomeLayerLabels = {
  singular: "Institutional Learning Outcome",
  short: "ILO",
};
