import type { Role } from "@/lib/constants/roles";

export type ReviewerRole = Extract<Role, "PROGRAM_HEAD" | "DEAN">;

export type CourseBoundReviewListItem = {
  evaluationId: string;
  evaluationTitle: string;
  courseTitle: string;
  programLabel: string;
  termInstanceLabel: string;
  deadlineAt: Date | null;
  responseCount: number;
  overallMean: number | null;
  reviewerRole: ReviewerRole;
};

export type CourseBoundReviewSectionQuestion = {
  itemKey: string;
  prompt: string;
  mean: number | null;
};

export type CourseBoundReviewSectionMetric = {
  id: string;
  name: string;
  mean: number | null;
  quantitativeQuestionCount: number;
  qualitativePromptCount: number;
  questions: CourseBoundReviewSectionQuestion[];
};

export type CourseBoundCiloMetric = {
  bindingId: string;
  ciloId: string | null;
  ciloLabel: string;
  ciloDescription: string;
  sectionKey: string;
  itemKey: string;
  questionPrompt: string;
  mean: number | null;
};

export type CourseBoundReviewResponseCard = {
  responseId: string;
  respondentLabel: string;
  submittedAt: Date;
  overallMean: number | null;
};

export type WordCloudToken = {
  text: string;
  value: number;
};

export type CourseBoundReviewDetail = {
  evaluationId: string;
  evaluationTitle: string;
  courseTitle: string;
  programLabel: string;
  termInstanceLabel: string;
  deadlineAt: Date | null;
  responseCount: number;
  overallMean: number | null;
  reviewerRole: ReviewerRole;
  qualitativeItemCount: number;
  ciloMetrics: CourseBoundCiloMetric[];
  sections: CourseBoundReviewSectionMetric[];
  responseCards: CourseBoundReviewResponseCard[];
  wordCloudTokens: WordCloudToken[];
};

export type CourseBoundResponseQuantitativeEntry = {
  itemKey: string;
  prompt: string;
  rating: number;
};

export type CourseBoundResponseQualitativeEntry = {
  promptKey: string;
  prompt: string;
  text: string;
};

export type CourseBoundResponseSection = {
  id: string;
  name: string;
  mean: number | null;
  quantitativeResponses: CourseBoundResponseQuantitativeEntry[];
  qualitativeResponses: CourseBoundResponseQualitativeEntry[];
};

export type CourseBoundResponseReview = {
  responseId: string;
  respondentLabel: string;
  submittedAt: Date;
  evaluationId: string;
  evaluationTitle: string;
  courseTitle: string;
  programLabel: string;
  termInstanceLabel: string;
  overallMean: number | null;
  reviewerRole: ReviewerRole;
  sections: CourseBoundResponseSection[];
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
  key: string;
  ciloId: string | null;
  label: string;
  description: string;
  questionPrompt: string;
  scaleGroups: FacultyScaleDistribution[];
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
    promptCounts: Array<{ prompt: string; itemCount: number; responseCount: number }>;
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
