import type { OutcomeEvidenceDTO, OutcomeScaleDistributionDTO } from "./outcome-evidence-types";
import type { QualitativeToneShape, WordCloudToken } from "./types";

type GeneralEducationAnalyticsPeriodOptions = {
  schoolYears: Array<{ id: string; label: string }>;
  semesters: Array<{ value: string; label: string }>;
  termInstances: Array<{
    id: string;
    schoolYearId: string;
    schoolYearLabel: string;
    semester: string;
    semesterLabel: string;
    termLabel: string | null;
    label: string;
  }>;
};
export type GeneralEducationAnalyticsOptions = GeneralEducationAnalyticsPeriodOptions & {
  courses: Array<{ id: string; label: string }>;
  programs: Array<{ id: string; label: string }>;
  yearLevels: Array<{ value: string; label: string }>;
  ilos: Array<{ id: string; label: string }>;
};
export type GeneralEducationAnalyticsKpi = {
  submittedResponseCount: number;
  evaluationOpportunityCount: number;
  responseRate: number | null;
  ratingCount: number;
  meanRating: number | null;
  spansMultipleScales: boolean;
  scaleContext: string | null;
  excludedRatingCount: number;
};
export type GeneralEducationAnalyticsEmptyReason = "no-assignments" | "no-submissions" | null;
export type GeneralEducationAnalyticsFrameDTO = {
  scope: { periodLabel: string | null };
  kpi: GeneralEducationAnalyticsKpi;
  emptyReason: GeneralEducationAnalyticsEmptyReason;
  options: GeneralEducationAnalyticsOptions;
};
export type GeneralEducationScaleGroupDTO = {
  scaleKey: string;
  scaleLabel: string;
  meanRating: number | null;
  ratingCount: number;
  submittedResponseCount: number;
  distribution: OutcomeScaleDistributionDTO;
};
export type GeneralEducationIloEvidenceDTO = OutcomeEvidenceDTO & {
  isActive: boolean;
  order: number;
};
export type GeneralEducationOutcomesDTO = {
  iloEvidenceApplicable?: boolean;
  commonModeCourseCount?: number;
  commonModeRatingCount?: number;
  emptyReason: GeneralEducationAnalyticsEmptyReason | "no-mapped-outcomes";
  outcomes: GeneralEducationIloEvidenceDTO[];
  currentMappingDisclosure: string;
  manyToManyDisclosure: boolean;
  unlinkedRatings: { generalItems: number; unmappedCilos: number };
  alignmentCoverage: Array<{
    outcomeId: string;
    code: string;
    learning: number;
    practice: number;
    opportunity: number;
    unclassified: number;
  }>;
  courseMatrix: Array<{
    courseId: string;
    courseCode: string;
    courseTitle: string;
    cells: Array<{
      outcomeId: string;
      aligned: boolean;
      meanRating: number | null;
      ratingCount: number;
      spansMultipleScales: boolean;
    }>;
  }>;
};
export type GeneralEducationCourseBreakdownRow = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  sectionCount: number;
  programCount: number;
  evaluationOpportunityCount: number;
  submittedResponseCount: number;
  responseRate: number | null;
  meanRating: number | null;
  ratingCount: number;
  excludedRatingCount: number;
  spansMultipleScales: boolean;
  instrumentContext: string | null;
  scaleGroups: GeneralEducationScaleGroupDTO[];
  alignedIlos: Array<{ id: string; code: string }>;
  previousComparable: { periodLabel: string; meanRating: number; change: number } | null;
  evidenceEvaluations: Array<{ evaluationId: string; deploymentName: string }>;
  sections: Array<{
    evaluationId: string;
    programCode: string;
    yearLevel: string;
    section: string;
    facultyName: string;
    submittedResponseCount: number;
    evaluationOpportunityCount: number;
    meanRating: number | null;
  }>;
};
export type GeneralEducationCoursesDTO = {
  emptyReason: GeneralEducationAnalyticsEmptyReason;
  rows: GeneralEducationCourseBreakdownRow[];
};
export type GeneralEducationProgramsDTO = {
  emptyReason: GeneralEducationAnalyticsEmptyReason;
  attributionNote: string;
  rows: Array<{
    programId: string;
    programCode: string;
    programName: string;
    courseCount: number;
    sectionCount: number;
    evaluationOpportunityCount: number;
    submittedResponseCount: number;
    responseRate: number | null;
    meanRating: number | null;
    ratingCount: number;
    spansMultipleScales: boolean;
    scaleGroups: GeneralEducationScaleGroupDTO[];
  }>;
  courseMatrix: Array<{
    courseId: string;
    courseCode: string;
    cells: Array<{
      programId: string;
      meanRating: number | null;
      ratingCount: number;
      submittedResponseCount: number;
      spansMultipleScales: boolean;
    }>;
  }>;
};
export type GeneralEducationTrendsDTO = {
  periods: Array<{
    termInstanceId: string;
    periodLabel: string;
    meanRating: number | null;
    submittedResponseCount: number;
    evaluationOpportunityCount: number;
    responseRate: number | null;
    ratingCount: number;
    instrumentContext: string | null;
    scaleContext: string | null;
    scaleDomain: [number, number] | null;
    outcomeCodes: string[];
    comparableWithPrevious: boolean;
  }>;
  breaks: Array<{ fromPeriodLabel: string; toPeriodLabel: string; reason: string }>;
  emptyReason: "no-evidence" | "no-comparable-history" | null;
};
export type GeneralEducationFeedbackDTO = {
  emptyReason: GeneralEducationAnalyticsEmptyReason | "no-qualitative-evidence";
  tokens: WordCloudToken[];
  tone: QualitativeToneShape;
  qualitativeItemCount: number;
  qualitativeResponseCount: number;
  sourceLabel: string;
  promptCounts: Array<{
    sourceLabel: string;
    promptLabel: string;
    promptKey: string;
    instrumentId: string;
    instrumentLabel: string;
    itemCount: number;
    responseCount: number;
    tone: QualitativeToneShape;
    terms: WordCloudToken[];
  }>;
  evidenceEvaluations: Array<{ evaluationId: string; deploymentName: string }>;
};
