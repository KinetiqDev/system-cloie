import type {
  DeploymentStatus,
  StudentSection,
  TargetStakeholder,
  YearLevel,
} from "@prisma/client";
import type {
  CiloMetric,
  CiloGoMapping,
  ParticipationSummary,
  QuestionMetric,
} from "@/features/analytics/aggregators/types";
import type { GoMetric } from "@/features/analytics/aggregators/go";
import type { WordCloudToken } from "@/features/analytics/types";
import type { OutcomeEvidenceDTO } from "@/features/analytics/outcome-evidence-types";
import type { CiloIloMapping } from "./services/cilo-mappings";

// ---------------------------------------------------------------------------
// Identified review belongs to Program Heads for Program-specific/Central
// evidence and to General Education Coordinators for General Education.
// These shapes never join Faculty/Dean aggregate DTOs.
// ---------------------------------------------------------------------------

/** One publication-time GO binding from `CentralDeploymentGoSnapshot`. */
export type ProgramWideGoBinding = {
  /**
   * Grouping key: `go_id` for live GOs, else the analytics snapshot key
   * `snapshot:<code>:<description>` so retired GOs stay deep-linkable.
   */
  key: string;
  code: string;
  description: string;
};

/**
 * Outcome binding of one submitted quantitative answer (§27.4).
 *
 * `layer` names the typed alignment the Course's CILOs actually reach, and
 * it is the discriminator: a General Education CILO carries ILO alignments
 * and no GO data, while a Program-specific CILO carries GO mappings and no
 * ILO data. Keeping both lists on one shape would let a renamed GO field
 * carry ILO rows, so each variant declares only the list it can hold.
 */
export type SubmittedCiloAnswerBinding =
  | {
      type: "CILO";
      layer: "GRADUATE_OUTCOME";
      ciloId: string | null;
      ciloLabel: string;
      /** Current CILO→GO mappings in the owning Program, with manifestation. */
      goMappings: CiloGoMapping[];
      /** Frozen direct GO bindings carried by this same course question. */
      directGoBindings: ProgramWideGoBinding[];
    }
  | {
      type: "CILO";
      layer: "INSTITUTIONAL_OUTCOME";
      ciloId: string | null;
      ciloLabel: string;
      /** Current CILO→ILO alignments with manifestation; the only outcome list here. */
      iloMappings: CiloIloMapping[];
    };

export type SubmittedAnswerBinding =
  | SubmittedCiloAnswerBinding
  | { type: "GO"; goBindings: ProgramWideGoBinding[] }
  | { type: "GENERAL" };

export type QuantitativeSubmittedAnswer = {
  kind: "quantitative";
  itemKey: string;
  prompt: string;
  rating: number;
  /** Full rating scale from the frozen snapshot, so the answer can be replayed. */
  scale: number[];
  /** Descriptor wording per scale value, aligned by index. */
  descriptorLabels: (string | null)[];
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
 * Identified submitted-response detail. Only the authorized evidence owner
 * receives this shape; aggregate analytics excludes identities and raw answers.
 */
export type IdentifiedSubmittedResponseDetail = {
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

/** One identified submitted respondent row (§25.5). */
export type IdentifiedSubmittedRespondentRow = {
  responseId: string;
  name: string;
  stakeholder: TargetStakeholder;
  majorLabel: string | null;
  yearLevel: YearLevel | null;
  section: StudentSection | null;
  submittedAt: Date;
  quantitativeMean: number | null;
};

/** One identified assignment row in a Program Head-only evaluation roster. */
export type ProgramHeadAssignmentRespondentRow = {
  assignmentId: string;
  responseId: string | null;
  name: string;
  stakeholder: TargetStakeholder;
  status: "SUBMITTED" | "IN_PROGRESS" | "NOT_STARTED";
  majorLabel: string | null;
  yearLevel: YearLevel | null;
  section: StudentSection | null;
  assignedAt: Date;
  submittedAt: Date | null;
  quantitativeMean: number | null;
};

/** Course-bound evaluation detail (spec §25). */
export type IdentifiedCourseEvaluationDetail = {
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
    /** Academic term instance behind this evaluation (§12 upward navigation). */
    termInstanceId: string;
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
  /**
   * Typed alignment layer the evaluation's CILOs reach. Program-specific
   * Courses resolve to GO mappings and General Education Courses to ILO
   * alignments, so a surface never infers the layer from wording.
   */
  alignmentLayer: ReviewAlignmentLayer;
  /**
   * Current ILO alignments behind each CILO id in `ciloResults`, in table
   * order. Empty on Program-specific Courses, where `ciloResults[].mappings`
   * already carries the GO layer.
   */
  iloMappingsByCilo: Record<string, CiloIloMapping[]>;
  /** ILO evidence for this one evaluation; empty for Program-specific Courses. */
  iloResults: OutcomeEvidenceDTO[];
  questionResults: QuestionMetric[];
  qualitative: QualitativeSummary;
  respondents: IdentifiedSubmittedRespondentRow[];
};

/** Which typed CILO→outcome table backs this evaluation's review surface. */
export type ReviewAlignmentLayer = "GRADUATE_OUTCOME" | "INSTITUTIONAL_OUTCOME";

/** Program-wide question result with its publication-time GO bindings. */
export type ProgramHeadCentralQuestionResult = QuestionMetric & {
  goBindings: ProgramWideGoBinding[];
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
  respondents: ProgramHeadAssignmentRespondentRow[];
  goResults: GoMetric[];
  questionResults: ProgramHeadCentralQuestionResult[];
  qualitative: QualitativeSummary;
};
