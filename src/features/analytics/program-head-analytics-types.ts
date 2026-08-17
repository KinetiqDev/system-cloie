/** Readable scope summary for the current analytics view */
export type ProgramHeadAnalyticsScopeSummary = {
  programCode: string;
  programName: string;
  periodLabel: string | null;
};

/** A canonical period option available in the selected Program scope. */
type ProgramHeadAnalyticsPeriodOption = {
  id: string;
  schoolYearId: string;
  schoolYearLabel: string;
  semester: string;
  semesterLabel: string;
  termLabel: string | null;
  label: string;
};

/** Context-aware period filter options; empty arrays omit their controls. */
export type ProgramHeadAnalyticsPeriodOptions = {
  schoolYears: Array<{ id: string; label: string }>;
  semesters: Array<{ value: string; label: string }>;
  termInstances: ProgramHeadAnalyticsPeriodOption[];
};

/** Overview KPI metrics */
export type ProgramHeadOverviewKPI = {
  submittedResponseCount: number;
  evaluationOpportunityCount: number;
  /** null when evaluationOpportunityCount is 0 (unavailable rate) */
  responseRate: number | null;
  ratingCount: number;
  /** Full precision mean; null when ratingCount is 0 */
  meanRating: number | null;
};

/** Reasons the overview may show an empty or partial state */
export type OverviewEmptyReason = "no-assignments" | "no-submissions" | null;

/** Closed, serializable Overview projection. */
export type ProgramHeadOverviewDTO = {
  scope: ProgramHeadAnalyticsScopeSummary;
  kpi: ProgramHeadOverviewKPI;
  emptyReason: OverviewEmptyReason;
  periodOptions: ProgramHeadAnalyticsPeriodOptions;
};

// ---------------------------------------------------------------------------
// Trends
// ---------------------------------------------------------------------------

/**
 * One comparable period in the Trends view. `comparableWithPrevious` is true
 * only when the previous chronological period is also rated and shares the
 * same instrument version, Likert scale identity, and mapped outcome identity.
 */
export type ProgramHeadTrendPeriodDTO = {
  termInstanceId: string;
  periodLabel: string;
  /** Full precision mean; null when the period has no valid ratings */
  meanRating: number | null;
  submittedResponseCount: number;
  ratingCount: number;
  /** Readable instrument/version context, e.g. "CILO Evaluation v2"; null without ratings */
  instrumentContext: string | null;
  /** Readable scale context, e.g. "1–5 (5-point)"; null without ratings */
  scaleContext: string | null;
  /** Graduate Outcome codes covered by the period's mapped evidence */
  outcomeCodes: string[];
  comparableWithPrevious: boolean;
};

/** Explanatory copy for a comparability break between two periods. */
export type ProgramHeadTrendBreakDTO = {
  fromPeriodLabel: string;
  toPeriodLabel: string;
  reason: string;
};

/**
 * Reasons the Trends view may show an empty state. `no-comparable-history`
 * still exposes the evidence table; the chart is omitted so a single point is
 * never implied to be a flat trend.
 */
export type ProgramHeadTrendsEmptyReason = "no-evidence" | "no-comparable-history" | null;

/** Closed, serializable Trends projection. */
export type ProgramHeadTrendsDTO = {
  scope: ProgramHeadAnalyticsScopeSummary;
  periods: ProgramHeadTrendPeriodDTO[];
  breaks: ProgramHeadTrendBreakDTO[];
  emptyReason: ProgramHeadTrendsEmptyReason;
  periodOptions: ProgramHeadAnalyticsPeriodOptions;
};

// ---------------------------------------------------------------------------
// Outcomes
// ---------------------------------------------------------------------------

/** One category of a scale-resolved Likert distribution. */
export type ProgramHeadOutcomeCategoryDTO = {
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
export type ProgramHeadOutcomeScaleDistributionDTO = {
  /** Readable scale summary, e.g. "1–5 (5-point)"; labels come from the frozen snapshot. */
  scaleLabel: string;
  categories: ProgramHeadOutcomeCategoryDTO[];
};

/**
 * One ranked Program Graduate Outcome evidence row. Mean retains full
 * precision; rating count is distinct from submitted response count.
 */
export type ProgramHeadOutcomeDTO = {
  goId: string;
  code: string;
  name: string;
  /** Full-precision mean of valid ratings; null when the row has no valid ratings. */
  meanRating: number | null;
  /** Count of valid in-scale ratings mapped to this GO. */
  ratingCount: number;
  /** Distinct submitted responses that contributed valid ratings to this GO. */
  submittedResponseCount: number;
  /** CILOs that contributed ratings to this row. */
  contributingCilos: Array<{ id: string; description: string }>;
  /** Courses whose course-bound evidence contributed to this row. */
  contributingCourses: Array<{ id: string; code: string; title: string }>;
  /**
   * Course-bound evaluations behind this row. Links resolve to the existing
   * selected-Program CILO review route, which independently re-authorizes
   * before exposing any raw response text.
   */
  evidenceEvaluations: Array<{ evaluationId: string; deploymentName: string }>;
  /** Scale-separated Likert distributions resolved from frozen structure snapshots. */
  distributions: ProgramHeadOutcomeScaleDistributionDTO[];
  /** Ratings excluded from the valid aggregate (unresolvable or out-of-scale values). */
  excludedRatingCount: number;
};

/**
 * Reasons the Outcomes view may show an empty state. The chain mirrors the
 * Overview: no assignments, no submissions, then no mapped outcome evidence.
 */
export type ProgramHeadOutcomesEmptyReason =
  | "no-assignments"
  | "no-submissions"
  | "no-mapped-outcomes"
  | null;

/** Closed, serializable Outcomes projection. */
export type ProgramHeadOutcomesDTO = {
  scope: ProgramHeadAnalyticsScopeSummary;
  periodOptions: ProgramHeadAnalyticsPeriodOptions;
  emptyReason: ProgramHeadOutcomesEmptyReason;
  /**
   * Disclosure that historical ratings are grouped by the Program's current
   * CILO-to-GO mappings because publication-time mapping snapshots do not
   * exist yet.
   */
  currentMappingDisclosure: string;
  /** True when a contributing CILO maps to more than one selected-Program GO. */
  manyToManyDisclosure: boolean;
  outcomes: ProgramHeadOutcomeDTO[];
};
