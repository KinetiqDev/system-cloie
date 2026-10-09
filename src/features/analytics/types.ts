import type { OutcomeAttainment } from "./aggregators/outcome-attainment";

export type WordCloudToken = {
  text: string;
  value: number;
  /** Distinct responses containing the term; present only where the producer tracked answer identity. */
  responseCount?: number;
};

/**
 * The one repeated-term threshold every qualitative surface applies. A term
 * reaches a reader only when it was mentioned more than once by more than
 * one distinct respondent, so no single answer can expose its own wording.
 */
export function isRepeatedTerm(token: WordCloudToken): boolean {
  return token.value > 1 && (token.responseCount ?? 0) > 1;
}

/**
 * Deterministic tone distribution over scored answers (ADR 0023). Counts only:
 * `positive + neutral + negative === scoredItemCount`.
 */
export type QualitativeToneShape = {
  scoredItemCount: number;
  positive: number;
  neutral: number;
  negative: number;
};

// Faculty Analytics is aggregate-only. No response, respondent, roster, or raw-comment
// shape belongs in this contract.
export const FACULTY_ANALYTICS_VIEWS = [
  "overview",
  "cilos",
  "questions",
  "trends",
  "qualitative",
] as const;

export type FacultyAnalyticsView = (typeof FACULTY_ANALYTICS_VIEWS)[number];

export type FacultyAnalyticsFilters = {
  termInstanceId?: string;
  courseId?: string;
  assignmentId?: string;
  evaluationId?: string;
  status?: "ACTIVE" | "CLOSED";
  view: FacultyAnalyticsView;
};

export type FacultyAnalyticsEvaluationItem = {
  id: string;
  deploymentName: string;
  assignmentId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  classLabel: string;
  programName: string;
  termInstanceId: string;
  termInstanceLabel: string;
  status: string;
  responseCount: number;
  opportunityCount: number;
};

export type FacultyScaleDistribution = {
  scaleKey: string;
  scaleLabel: string;
  scaleMin: number;
  scaleMax: number;
  mean: number | null;
  ratingCount: number;
  responseCount: number;
  excludedRatingCount: number;
  categories: Array<{
    value: number;
    label: string;
    count: number;
    percentage: number;
  }>;
};

export type FacultyCiloMetric = {
  /** Stable identity: the evaluation plus the CILO (or the lone binding). */
  key: string;
  ciloId: string | null;
  label: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  evaluationId: string;
  evaluationName: string;
  description: string;
  /** Every Likert question evidencing this CILO, in binding order. */
  questions: Array<{ sectionKey: string; itemKey: string; prompt: string }>;
  scaleGroups: FacultyScaleDistribution[];
  /**
   * Deterministic CLOIE_OUTCOME_MEAN_V1 interpretation for this CILO mean,
   * based only on classifiable CILO evidence. Absent only for legacy payloads.
   */
  attainment?: OutcomeAttainment;
};

export type FacultyQuestionMetric = {
  key: string;
  sectionTitle: string;
  prompt: string;
  ciloLabel: string | null;
  scaleGroups: FacultyScaleDistribution[];
};

export type FacultyTrendPoint = {
  key: string;
  courseId: string;
  courseCode: string;
  periodLabel: string;
  mean: number | null;
  responseCount: number;
  ratingCount: number;
  scaleLabel: string | null;
  comparableWithPrevious: boolean;
  breakReason: string | null;
};

export type FacultyAnalyticsData = {
  filters: FacultyAnalyticsFilters;
  scopeLabel: string;
  evaluations: FacultyAnalyticsEvaluationItem[];
  kpi: {
    submittedResponseCount: number;
    opportunityCount: number;
    responseRate: number | null;
    validRatingCount: number;
    overallMean: number | null;
    overallScaleLabel: string | null;
    overallScaleMax: number | null;
    spansMultipleScales: boolean;
  };
  ratingDistributions: FacultyScaleDistribution[];
  ciloMetrics: FacultyCiloMetric[];
  questionMetrics: FacultyQuestionMetric[];
  trends: FacultyTrendPoint[];
  qualitative: {
    available: boolean;
    submittedResponseCount: number;
    responseCount: number;
    itemCount: number;
    evaluationCount: number;
    tokens: WordCloudToken[];
    tone: QualitativeToneShape;
    promptCounts: Array<{
      prompt: string;
      /** Stable instrument identity; two versions can share a visible label. */
      instrumentId: string;
      /** Instrument version the answers came from; two versions never merge into one row. */
      instrumentLabel: string;
      itemCount: number;
      responseCount: number;
      tone: QualitativeToneShape;
      terms: WordCloudToken[];
    }>;
  };
};

export type FacultyAnalyticsOptions = {
  terms: Array<{ id: string; label: string }>;
  courses: Array<{ id: string; label: string }>;
  assignments: Array<{ id: string; courseId: string; termInstanceId: string; label: string }>;
  evaluations: FacultyAnalyticsEvaluationItem[];
};

export type GetFacultyAnalyticsDataResult =
  | { success: true; data: FacultyAnalyticsData }
  | { success: false; error: string };
