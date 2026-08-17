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
  /**
   * True when the pooled mean combines ratings from more than one distinct
   * instrument-version scale identity. The mean stays spec-mandated
   * full-precision, and the UI discloses that cross-scale values are not
   * directly comparable.
   */
  spansMultipleScales: boolean;
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

// ---------------------------------------------------------------------------
// Stakeholders
// ---------------------------------------------------------------------------

/**
 * Canonical evidence source buckets for the selected Program. Course-bound
 * student evidence is distinct from central student-respondent evidence;
 * Alumni and Industry Partner evidence are central-deployment sources. Sources
 * are never interchangeable merely because they use rating values.
 */
export type ProgramHeadStakeholderSourceKey =
  | "COURSE_STUDENT"
  | "CENTRAL_STUDENT"
  | "ALUMNI"
  | "INDUSTRY_PARTNER";

/** One source-aware stakeholder evidence bucket. */
export type ProgramHeadStakeholderBucketDTO = {
  sourceKey: ProgramHeadStakeholderSourceKey;
  sourceLabel: string;
  /** Short disclosure of what produced this evidence. */
  sourceDescription: string;
  /**
   * Distinct instrument labels behind the bucket (e.g. "CILO Evaluation v2");
   * null when the bucket has no instrument disclosure.
   */
  instrumentContext: string | null;
  /** Full-precision mean pooled within this source only; null when unrated. */
  meanRating: number | null;
  /** Valid quantitative items in this bucket, distinct from response count. */
  ratingCount: number;
  /** Distinct submitted responses in this bucket. */
  submittedResponseCount: number;
};

/** Reasons the Stakeholders view may show an empty state. */
export type ProgramHeadStakeholdersEmptyReason = "no-assignments" | "no-submissions" | null;

/** Closed, serializable Stakeholders projection. */
export type ProgramHeadStakeholdersDTO = {
  scope: ProgramHeadAnalyticsScopeSummary;
  periodOptions: ProgramHeadAnalyticsPeriodOptions;
  emptyReason: ProgramHeadStakeholdersEmptyReason;
  /** Disclosure that evidence sources use different instruments and populations. */
  sourceSeparationDisclosure: string;
  /** Only buckets with submitted evidence in the selected scope. */
  buckets: ProgramHeadStakeholderBucketDTO[];
};

// ---------------------------------------------------------------------------
// Breakdowns
// ---------------------------------------------------------------------------

/** One defensible or Unspecified breakdown row. */
export type ProgramHeadBreakdownRowDTO = {
  /** Stable row identity (course id, instrument version id, major id, year level). */
  key: string;
  label: string;
  /** True for the aggregate of evidence without defensible attribution. */
  isUnspecified: boolean;
  /** Full-precision mean; null when the row has no valid ratings. */
  meanRating: number | null;
  /** Valid quantitative items in this row, distinct from response count. */
  ratingCount: number;
  /** Distinct submitted responses contributing to this row. */
  submittedResponseCount: number;
};

/** Course breakdown row: course-bound student evidence only. */
export type ProgramHeadCourseBreakdownRowDTO = ProgramHeadBreakdownRowDTO & {
  courseCode: string;
  /** Distinct instrument labels behind the course; null when none. */
  instrumentContext: string | null;
  /**
   * Course-bound evaluations behind this row. Links resolve to the existing
   * selected-Program CILO review route, which independently re-authorizes
   * before exposing any raw response text.
   */
  evidenceEvaluations: Array<{ evaluationId: string; deploymentName: string }>;
};

/** Per-source stats of one instrument version; sources are never pooled. */
export type ProgramHeadInstrumentSourceDTO = ProgramHeadBreakdownRowDTO & {
  sourceKey: ProgramHeadStakeholderSourceKey;
  sourceLabel: string;
};

/**
 * One instrument version breakdown row. Ratings are separated by evidence
 * source so unlike populations are never pooled into one construct.
 */
export type ProgramHeadInstrumentBreakdownRowDTO = {
  instrumentVersionId: string;
  /** Readable instrument label, e.g. "CILO Evaluation v2". */
  instrumentLabel: string;
  sources: ProgramHeadInstrumentSourceDTO[];
};

/**
 * A defensible contextual dimension (major or year level). Rows carry only
 * evidence whose attribution is defensible and are separated by evidence
 * source; evidence without applicable attribution is aggregated into
 * per-source `Unspecified` rows rather than guessed.
 */
export type ProgramHeadContextualBreakdownDTO = {
  rows: ProgramHeadBreakdownRowDTO[];
  /** Per-source aggregates of evidence without defensible attribution; empty when none exists. */
  unspecified: ProgramHeadBreakdownRowDTO[];
  /** Explains how attribution is derived and when it is reported as Unspecified. */
  attributionNote: string;
};

/** Reasons the Breakdowns view may show an empty state. */
export type ProgramHeadBreakdownsEmptyReason = "no-assignments" | "no-submissions" | null;

/** Closed, serializable Breakdowns projection. */
export type ProgramHeadBreakdownsDTO = {
  scope: ProgramHeadAnalyticsScopeSummary;
  periodOptions: ProgramHeadAnalyticsPeriodOptions;
  emptyReason: ProgramHeadBreakdownsEmptyReason;
  /** Course-bound student evidence grouped by course; empty when none exists. */
  courseRows: ProgramHeadCourseBreakdownRowDTO[];
  /** Instrument-version rows with per-source separation; empty when none exists. */
  instrumentRows: ProgramHeadInstrumentBreakdownRowDTO[];
  /** Null when no evidence has defensible major attribution. */
  majorBreakdown: ProgramHeadContextualBreakdownDTO | null;
  /** Null when no evidence has defensible year-level attribution. */
  yearLevelBreakdown: ProgramHeadContextualBreakdownDTO | null;
};

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

/** One de-identified word-frequency token. Keys stay `{ text, value }`. */
export type ProgramHeadFeedbackTokenDTO = {
  text: string;
  value: number;
};

/** Aggregate qualitative item and response counts for one evidence source. */
export type ProgramHeadFeedbackSourceCountDTO = {
  sourceKey: ProgramHeadStakeholderSourceKey;
  sourceLabel: string;
  itemCount: number;
  responseCount: number;
};

/** Aggregate qualitative item and response counts for one source-qualified prompt. */
export type ProgramHeadFeedbackPromptCountDTO = {
  sourceLabel: string;
  promptLabel: string;
  itemCount: number;
  responseCount: number;
};

/**
 * Course-bound evaluation that contributed qualitative evidence. The view
 * builds the selected-Program CILO review path; that route independently
 * re-authorizes before showing raw comments.
 */
export type ProgramHeadFeedbackEvidenceDTO = {
  evaluationId: string;
  deploymentName: string;
};

/**
 * Reasons the Feedback view may show an empty state. The chain mirrors
 * Outcomes: assignments, submissions, then qualitative evidence.
 */
export type ProgramHeadFeedbackEmptyReason =
  | "no-assignments"
  | "no-submissions"
  | "no-qualitative-evidence"
  | null;

/**
 * Closed, serializable Feedback projection. Tokens, counts, labels, and
 * authorized evaluation links only. Raw qualitative text, response IDs,
 * respondent IDs, emails, assignments, and qualitative item rows stay out.
 */
export type ProgramHeadFeedbackDTO = {
  scope: ProgramHeadAnalyticsScopeSummary;
  periodOptions: ProgramHeadAnalyticsPeriodOptions;
  emptyReason: ProgramHeadFeedbackEmptyReason;
  tokens: ProgramHeadFeedbackTokenDTO[];
  qualitativeItemCount: number;
  qualitativeResponseCount: number;
  sourceCounts: ProgramHeadFeedbackSourceCountDTO[];
  promptCounts: ProgramHeadFeedbackPromptCountDTO[];
  evidenceEvaluations: ProgramHeadFeedbackEvidenceDTO[];
};

// ---------------------------------------------------------------------------
// AI Insights
// ---------------------------------------------------------------------------

/**
 * Sentiment labels a provider may assign to one bounded evidence category.
 * The union is fixed; System CLOIE computes displayed counts and percentages
 * from the validated classifications instead of trusting model totals.
 */
export type ProgramHeadAISentimentStatus = "positive" | "negative" | "neutral" | "mixed";

/** One provider classification over one supplied aggregate evidence category. */
type ProgramHeadAISentimentClassificationDTO = {
  /** Bounded label of the analyzed aggregate evidence category, e.g. a source label. */
  evidenceCategory: string;
  sentiment: ProgramHeadAISentimentStatus;
  rationale: string;
};

/** Locally computed sentiment count and share of all classifications. */
type ProgramHeadAISentimentCountDTO = {
  sentiment: ProgramHeadAISentimentStatus;
  count: number;
  /** Full-precision share of all classifications; round only for display. */
  percentage: number;
};

/** One bounded theme over the supplied aggregate evidence. */
type ProgramHeadAIThemeDTO = {
  name: string;
  summary: string;
};

/**
 * What the provider actually analyzed vs. what was available. Discloses that
 * interpretation covers bounded aggregate evidence only, never raw comments.
 */
type ProgramHeadAIEvidenceScopeDTO = {
  submittedResponseCount: number;
  qualitativeItemCount: number;
  /** Distinct readable source labels included in the evidence packet. */
  evaluatedSourceLabels: string[];
  tokenAnalysis: {
    availableTokenCount: number;
    includedTokenCount: number;
    truncated: boolean;
  };
};

/**
 * Validated, bounded AI interpretation returned to the browser. Contains only
 * model-authored aggregate findings plus System CLOIE-computed counts and the
 * filter fingerprint; no raw evidence, identifiers, or response rows.
 */
export type ProgramHeadAIInsightsSuccessDTO = {
  /** Filter fingerprint of the scope this interpretation was generated for. */
  fingerprint: string;
  scope: ProgramHeadAnalyticsScopeSummary;
  summary: string;
  strengths: string[];
  areasForReview: string[];
  themes: ProgramHeadAIThemeDTO[];
  sentimentClassifications: ProgramHeadAISentimentClassificationDTO[];
  sentimentCounts: ProgramHeadAISentimentCountDTO[];
  questionsForHumanReview: string[];
  limitations: string[];
  evidenceScope: ProgramHeadAIEvidenceScopeDTO;
};
