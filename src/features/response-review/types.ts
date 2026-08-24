import type {
  DeploymentStatus,
  StudentSection,
  TargetStakeholder,
  YearLevel,
} from "@prisma/client";
import type {
  CiloMetric,
  CiloPloMapping,
  ParticipationSummary,
  QuestionMetric,
} from "@/features/analytics/aggregators/types";
import type { PloMetric } from "@/features/analytics/aggregators/plo";
import type { WordCloudToken } from "@/features/analytics/types";

// ---------------------------------------------------------------------------
// Program Head identified response review (spec §25–§27, §31, §40)
//
// These DTOs are Program Head-only shapes and live in a distinct feature
// boundary so identity fields can never join the Faculty/anonymized DTOs in
// src/features/analytics/types.ts (§31: "Never add respondent identity fields
// to a shared DTO consumed by Faculty").
// ---------------------------------------------------------------------------

/** One publication-time PLO binding from `CentralDeploymentPloSnapshot`. */
export type ProgramWidePloBinding = {
  /** Grouping key: `plo_id` when snapshotted, else `plo_code_snapshot`. */
  key: string;
  code: string;
  description: string;
};

/** Outcome binding of one submitted quantitative answer (§27.4). */
export type SubmittedAnswerBinding =
  | {
      type: "CILO";
      ciloId: string | null;
      ciloLabel: string;
      /** Selected Program's current CILO→PLO mappings, with manifestation. */
      ploMappings: CiloPloMapping[];
    }
  | { type: "PLO"; ploBindings: ProgramWidePloBinding[] }
  | { type: "GENERAL" };

export type QuantitativeSubmittedAnswer = {
  kind: "quantitative";
  itemKey: string;
  prompt: string;
  rating: number;
  /** Label of the selected scale value; null when the snapshot has none. */
  scaleLabel: string | null;
  binding: SubmittedAnswerBinding;
};

type QualitativeSubmittedAnswer = {
  kind: "qualitative";
  promptKey: string;
  prompt: string;
  text: string;
};

type SubmittedResponseSection = {
  key: string;
  title: string;
  items: Array<QuantitativeSubmittedAnswer | QualitativeSubmittedAnswer>;
};

type RespondentStudentContext = {
  programId: string;
  programLabel: string;
  majorId: string | null;
  majorLabel: string | null;
  yearLevel: YearLevel;
  section: StudentSection | null;
};

type RespondentAlumniContext = {
  programLabel: string | null;
  majorLabel: string | null;
  graduationYear: number;
};

type RespondentIndustryContext = {
  companyName: string;
  position: string | null;
};

/** Term-scoped academic context for a course-bound response (§27.1). */
export type CourseBoundResponseContext = {
  courseCode: string;
  courseTitle: string;
  facultyName: string | null;
  yearLevel: YearLevel | null;
  section: StudentSection | null;
  majorLabel: string | null;
  periodLabel: string;

  /** Academic term instance behind the response (§12 upward navigation). */
  termInstanceId: string;
};

/** Publication-time context for a program-wide response (§27.2–§27.3). */
export type ProgramWideResponseContext = {
  stakeholder: TargetStakeholder;
  targetProgramLabel: string | null;
  targetMajorLabel: string | null;
  targetYearLevel: YearLevel | null;
  instrumentVersion: number;
  periodLabel: string;

  /** Academic term instance behind the response (§12 upward navigation). */
  termInstanceId: string;
};

/**
 * Program Head identified submitted-response detail (spec §40). Faculty and
 * Dean never receive this shape; their flow keeps
 * `CourseBoundResponseReview` with its anonymized respondent label.
 */
export type ProgramHeadSubmittedResponseDetail = {
  responseId: string;
  submittedAt: Date;
  respondent: {
    id: string;
    name: string;
    stakeholder: TargetStakeholder;
    studentContext?: RespondentStudentContext;
    alumniContext?: RespondentAlumniContext;
    industryContext?: RespondentIndustryContext;
  };
  evaluation:
    | {
        id: string;
        type: "COURSE_BOUND";
        title: string;
        context: CourseBoundResponseContext;
      }
    | {
        id: string;
        type: "PROGRAM_WIDE";
        title: string;
        context: ProgramWideResponseContext;
      };
  quantitativeMean: number | null;
  sections: SubmittedResponseSection[];
};

/** Qualitative evidence summary for an evaluation detail (§25.3, §26). */
export type QualitativeSummary = {
  answerCount: number;
  respondentCount: number;
  /** Non-empty answers grouped by prompt, ordered by count descending. */
  prompts: Array<{ prompt: string; answerCount: number }>;
  /** Weighted top terms from the submitted qualitative texts (§20.5). */
  topTerms: WordCloudToken[];
};

/** One identified submitted respondent row (§25.5, §26). */
export type ProgramHeadRespondentRow = {  responseId: string;
  name: string;
  stakeholder: TargetStakeholder;
  majorLabel: string | null;
  yearLevel: YearLevel | null;
  section: StudentSection | null;
  submittedAt: Date;
  quantitativeMean: number | null;
};

/** Course-bound evaluation detail (spec §25). */
export type ProgramHeadCourseEvaluationDetail = {
  evaluation: {
    id: string;
    title: string;
    courseCode: string;
    courseTitle: string;
    facultyName: string | null;
    yearLevel: YearLevel;
    section: StudentSection;
    majorLabel: string | null;
    periodLabel: string;
    activationAt: Date | null;
    deadlineAt: Date | null;
    status: DeploymentStatus;
  };
  summary: {
    eligibleCount: number;
    submittedCount: number;
    completionRate: number | null;
    /** Evaluation quantitative mean (§6.2); null when scales are mixed (§9). */
    evaluationMean: number | null;
    /** Distinct compatible scale groups behind the mean (0 = no ratings). */
    evaluationScaleCount: number;
    ciloCount: number;
    qualitativeAnswerCount: number;
    qualitativeRespondentCount: number;
  };
  participation: ParticipationSummary;
  ciloResults: CiloMetric[];
  questionResults: QuestionMetric[];
  qualitative: QualitativeSummary;
  respondents: ProgramHeadRespondentRow[];
};

/** Program-wide question result with its publication-time PLO bindings. */
export type ProgramHeadCentralQuestionResult = QuestionMetric & {
  ploBindings: ProgramWidePloBinding[];
};

/** Program-wide evaluation detail (spec §26). */
export type ProgramHeadCentralEvaluationDetail = {
  evaluation: {
    id: string;
    title: string;
    stakeholder: TargetStakeholder;
    targetProgramLabel: string | null;
    targetMajorLabel: string | null;
    targetYearLevel: YearLevel | null;
    instrumentVersion: number;
    periodLabel: string;
    activationAt: Date | null;
    deadlineAt: Date | null;
    status: DeploymentStatus;
  };
  summary: {
    assignedCount: number;
    submittedCount: number;
    completionRate: number | null;
    evaluationMean: number | null;
    evaluationScaleCount: number;
    qualitativeAnswerCount: number;
    qualitativeRespondentCount: number;
  };
  participation: ParticipationSummary;
  /** Direct PLO results grouped by `plo_id ?? plo_code_snapshot` (§26). */
  ploResults: PloMetric[];
  questionResults: ProgramHeadCentralQuestionResult[];
  qualitative: QualitativeSummary;
  respondents: ProgramHeadRespondentRow[];
};
