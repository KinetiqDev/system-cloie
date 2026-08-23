import type { CILOMappingManifestation, TargetStakeholder } from "@prisma/client";
import type { ScaleIdentity } from "./scale-identity";

// ---------------------------------------------------------------------------
// Canonical shared metric contracts
//
// Spec §35–§36, §38–§39, §41: every Program Head surface (dashboard,
// analytics, responses) consumes these shapes instead of recomputing metrics.
// Means keep full server precision; rounding happens at the presentation
// boundary. Rating count, response count, and assignment count stay distinct.
// ---------------------------------------------------------------------------

/**
 * One count of a Likert distribution category. Percentages are computed at
 * full precision; presentation rounds for display only.
 */
export type ScaleCategoryCount = {
  value: number;
  label: string;
  count: number;
  percentage: number;
};

/**
 * Canonical quantitative metric over one compatible scale group (spec §36).
 * `mean` is null when no valid rating contributed. The distribution always
 * carries one entry per scale value so reconciliation holds:
 * sum(counts) = ratingCount and the weighted mean equals `mean` within
 * floating-point tolerance.
 *
 * Evidence spanning incompatible scales is returned as separate groups, never
 * merged into one invalid combined metric (spec §9).
 */
export type QuantitativeMetric = {
  mean: number | null;
  ratingCount: number;
  responseCount: number;

  /** Identity of the compatible scale group; null when no scale resolved. */
  scale: ScaleIdentity | null;

  distribution: ScaleCategoryCount[];
};

/** Stakeholder-scoped participation slice (spec §13.2 breakdown). */
export type StakeholderParticipation = {
  stakeholder: TargetStakeholder;
  assigned: number;
  submitted: number;
  inProgress: number;
  notStarted: number;
  completionRate: number | null;
};

/**
 * Canonical participation projection (spec §35). Assignment counts use every
 * in-scope EvaluationAssignment row as denominator (resolved §5.12):
 * submitted + inProgress + notStarted = assigned.
 *
 * `respondents` is person-level status across all of a person's in-scope
 * assignments (spec §13.3): complete = every assignment submitted, partial =
 * started but not all submitted, notStarted = no response on any assignment;
 * total = complete + partial + notStarted.
 *
 * A completionRate of null means no in-scope assignments exist: there is no
 * response rate rather than a zero-percent response rate.
 */
export type ParticipationSummary = {
  assigned: number;
  submitted: number;
  inProgress: number;
  notStarted: number;
  completionRate: number | null;

  stakeholders: StakeholderParticipation[];

  respondents: {
    total: number;
    complete: number;
    partial: number;
    notStarted: number;
  };
};

/** One CILO-to-PLO mapping with its descriptive manifestation label. */
export type CiloPloMapping = {
  ploId: string;
  ploCode: string;
  ploDescription: string;
  manifestation: CILOMappingManifestation;
};

/** One quantitative question bound to a CILO and contributing to its metric. */
export type CiloContributingQuestion = {
  sectionKey: string;
  itemKey: string;
  prompt: string;
};

/**
 * Canonical CILO metric (spec §38). Ratings pool raw across every question
 * bound to the CILO — never a mean of question means.
 *
 * When contributing questions span incompatible scales, `quantitative` is
 * null and each compatible group appears once in `scaleGroups` (spec §9);
 * with exactly one group it also mirrors into `quantitative`.
 */
export type CiloMetric = {
  ciloId: string;
  description: string;

  quantitative: QuantitativeMetric | null;

  /** One entry per compatible scale identity; length 1 mirrors `quantitative`. */
  scaleGroups: QuantitativeMetric[];

  mappings: CiloPloMapping[];

  contributingQuestions: CiloContributingQuestion[];

  /**
   * How-calculated metadata for traceability UI (§41): derived from the same
   * aggregated inputs, never a separate data source.
   */
  evidenceSummary: MetricEvidenceSummary;
};

/**
 * Binding provenance of one question (spec §39). Unbound items are explicit
 * GENERAL rather than null so UI components never interpret absence.
 */
export type QuestionBinding =
  | { type: "CILO"; ciloId: string; ciloLabel: string }
  | { type: "GENERAL" };

/**
 * Canonical per-question metric (spec §39). One instrument-version item
 * resolves to exactly one snapshot scale entry; when evaluations on
 * different instrument versions share an item key, each compatible group is
 * reported separately (§9) and `quantitative` mirrors the single-group case.
 */
export type QuestionMetric = {
  sectionKey: string;
  itemKey: string;
  prompt: string;

  binding: QuestionBinding;

  /** Mean of the single compatible scale group; null when groups are mixed. */
  quantitative: QuantitativeMetric | null;

  /** One entry per compatible scale identity; length 1 mirrors `quantitative`. */
  scaleGroups: QuantitativeMetric[];
};

/**
 * Presentation metadata behind a major metric for "How calculated" UI
 * (spec §41). All count fields are optional context; `explanation` carries
 * the human-readable calculation description. No trace table exists for v1.
 */
export type MetricEvidenceSummary = {
  ratingCount?: number;
  responseCount?: number;
  assignmentCount?: number;
  evaluationCount?: number;
  questionCount?: number;
  scaleLabel?: string;
  explanation: string;
  evidenceHref?: string;
};
