/** Canonical period option for the Coordinator analytics workspace. */
type GeneralEducationAnalyticsPeriodOption = {
  id: string;
  schoolYearId: string;
  schoolYearLabel: string;
  semester: string;
  semesterLabel: string;
  termLabel: string | null;
  label: string;
};

/** Filter options exposed to the Coordinator workspace. Empty arrays omit controls. */
type GeneralEducationAnalyticsPeriodOptions = {
  schoolYears: Array<{ id: string; label: string }>;
  semesters: Array<{ value: string; label: string }>;
  termInstances: GeneralEducationAnalyticsPeriodOption[];
};

/** Overview KPI metrics for cross-program General Education evidence. */
type GeneralEducationAnalyticsOverviewKPI = {
  submittedResponseCount: number;
  evaluationOpportunityCount: number;
  /** null when evaluationOpportunityCount is 0 (unavailable rate, not 0%) */
  responseRate: number | null;
  ratingCount: number;
  /** Full precision mean; null when ratingCount is 0 */
  meanRating: number | null;
};

type GeneralEducationAnalyticsEmptyReason = "no-assignments" | "no-submissions" | null;

/** Closed Coordinator analytics DTO — aggregate only, never raw evidence. */
export type GeneralEducationAnalyticsDTO = {
  scope: { periodLabel: string | null };
  kpi: GeneralEducationAnalyticsOverviewKPI;
  emptyReason: GeneralEducationAnalyticsEmptyReason;
  periodOptions: GeneralEducationAnalyticsPeriodOptions;
  /** Per-course breakdown, cross-program. */
  courseBreakdowns: GeneralEducationCourseBreakdownRow[];
  /** Comparable trends across academic periods. */
  trends: GeneralEducationTrendsDTO;
  /** Aggregate feedback tokens only — never raw comments. */
  feedback: GeneralEducationFeedbackDTO;
};

export type GeneralEducationCourseBreakdownRow = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  meanRating: number | null;
  ratingCount: number;
  submittedResponseCount: number;
  instrumentContext: string | null;
  scaleContext: string | null;
  outcomeCodes: string[];
};

type GeneralEducationTrendPeriodDTO = {
  termInstanceId: string;
  periodLabel: string;
  meanRating: number | null;
  submittedResponseCount: number;
  ratingCount: number;
  instrumentContext: string | null;
  scaleContext: string | null;
  outcomeCodes: string[];
  comparableWithPrevious: boolean;
};

type GeneralEducationTrendBreakDTO = {
  fromPeriodLabel: string;
  toPeriodLabel: string;
  reason: string;
};

type GeneralEducationTrendsEmptyReason = "no-evidence" | "no-comparable-history" | null;

export type GeneralEducationTrendsDTO = {
  periods: GeneralEducationTrendPeriodDTO[];
  breaks: GeneralEducationTrendBreakDTO[];
  emptyReason: GeneralEducationTrendsEmptyReason;
};

/** One de-identified word-frequency token. Keys stay { text, value }. */
type GeneralEducationFeedbackTokenDTO = {
  text: string;
  value: number;
};

export type GeneralEducationFeedbackDTO = {
  emptyReason: "no-assignments" | "no-submissions" | "no-qualitative-evidence" | null;
  tokens: GeneralEducationFeedbackTokenDTO[];
  qualitativeItemCount: number;
  qualitativeResponseCount: number;
  sourceLabel: string;
  promptCounts: Array<{
    sourceLabel: string;
    promptLabel: string;
    itemCount: number;
    responseCount: number;
  }>;
  evidenceEvaluations: Array<{ evaluationId: string; deploymentName: string }>;
};
