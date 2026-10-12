import type {
  AcademicSemester,
  AcademicTerm,
  CILOMappingManifestation,
  DeploymentStatus,
  POClassification,
  ResponseStatus,
  StudentSection,
  TargetStakeholder,
  YearLevel,
} from "@prisma/client";
import { TargetStakeholder as Stakeholder } from "@prisma/client";
import type { CiloGoMapping } from "@/features/analytics/aggregators/types";
import type { SnapshotItemApplicability } from "@/features/analytics/services/snapshot-structure";

// ---------------------------------------------------------------------------
// Program Head report-export read model
//
// One Program, one academic period, optionally one year level. Every record is
// a submitted evaluation response row or the catalog context that describes it.
// The report builders project this model through the canonical Analytics
// aggregators; nothing here computes a mean, a count, or an interpretation.
// ---------------------------------------------------------------------------

/** Academic period context of one export, resolved from the authorized filters. */
export type ReportPeriodContext = {
  schoolYearId: string | null;
  schoolYearCode: string | null;
  semester: AcademicSemester | null;
  semesterLabel: string | null;
  termInstanceId: string | null;
  termLabel: string | null;
  /** Readable period label, or `All academic periods` for an unfiltered export. */
  label: string;
};

/** Academic period parts of one term instance, with canonical labels. */
export type ReportTermInstance = {
  termInstanceId: string;
  schoolYearCode: string;
  semester: AcademicSemester;
  semesterLabel: string;
  term: AcademicTerm | null;
  termLabel: string | null;
  label: string;
};

/** One Program Outcome of the selected Program with its real classification. */
export type ReportProgramOutcome = {
  id: string;
  code: string;
  description: string;
  classification: POClassification;
  classificationLabel: string;
  isActive: boolean;
  order: number;
};

/** One current CILO-to-PO mapping in the selected Program. */
export type ReportCiloMapping = CiloGoMapping & {
  classification: POClassification;
  classificationLabel: string;
};

/** Publication-time CILO question binding of one course-bound evaluation. */
export type ReportCiloQuestionBinding = {
  sectionKey: string;
  itemKey: string;
  ciloId: string | null;
  ciloLabel: string;
  ciloDescription: string;
  questionPrompt: string;
};

/** Publication-time direct question-to-PO binding (frozen snapshot labels). */
export type ReportDirectPoBinding = {
  sectionKey: string;
  itemKey: string;
  poId: string | null;
  poCode: string;
  poDescription: string;
  questionPrompt: string;
};

/** One applicable quantitative question of a frozen instrument structure. */
export type ReportQuestion = {
  sectionKey: string;
  sectionTitle: string;
  itemKey: string;
  prompt: string;
  applicability: SnapshotItemApplicability;
};

/** One submitted response with its original rating answers and respondent name. */
export type ReportResponseRow = {
  responseId: string;
  respondentId: string;
  /** Account name of the respondent; `null` when the account name is blank. */
  respondentName: string | null;
  submittedAt: Date | null;
  answers: Array<{ sectionKey: string; itemKey: string; ratingValue: number }>;
};

/**
 * One Professional Course class group: a course assignment, its published
 * evaluation, the frozen instrument structure, and its submitted responses.
 * Two faculty members or two sections of one course stay two class groups.
 */
export type ReportCourseGroup = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  courseAssignmentId: string;
  facultyId: string | null;
  facultyName: string;
  section: StudentSection | null;
  yearLevel: YearLevel | null;
  yearLevelLabel: string;
  evaluationId: string;
  evaluationName: string;
  evaluationStatus: DeploymentStatus;
  termInstance: ReportTermInstance;
  instrumentId: string;
  instrumentLabel: string;
  structureSnapshot: unknown;
  /** Publication-time CILO snapshot of the evaluation, used for CILO labels. */
  cilosSnapshot: unknown;
  ciloBindings: ReportCiloQuestionBinding[];
  directPoBindings: ReportDirectPoBinding[];
  /** Every `EvaluationAssignment` row: the canonical opportunity denominator. */
  assignedRespondentCount: number;
  /** Per-assignment response status for the canonical participation aggregator. */
  submissions: Array<{ respondentId: string; responseStatus: ResponseStatus | null }>;
  responses: ReportResponseRow[];
};

/** One Central deployment and its submitted responses (program-wide evidence). */
export type ReportCentralGroup = {
  deploymentId: string;
  deploymentName: string;
  deploymentStatus: DeploymentStatus;
  targetStakeholder: TargetStakeholder;
  majorLabel: string | null;
  yearLevel: YearLevel | null;
  termInstance: ReportTermInstance;
  instrumentId: string;
  instrumentLabel: string;
  structureSnapshot: unknown;
  poBindings: ReportDirectPoBinding[];
  assignedRespondentCount: number;
  /** Per-assignment response status for the canonical participation aggregator. */
  submissions: Array<{ respondentId: string; responseStatus: ResponseStatus | null }>;
  responses: ReportResponseRow[];
};

/** The complete authorized evidence read behind one export. */
export type ReportEvidence = {
  programId: string;
  programCode: string;
  programName: string;
  period: ReportPeriodContext;
  /** Selected year level filter; null exports every year level. */
  yearLevel: YearLevel | null;
  yearLevelLabel: string;
  outcomes: ReportProgramOutcome[];
  /** Current Program CILO-to-PO mappings keyed by CILO id. */
  ciloMappings: Map<string, ReportCiloMapping[]>;
  courseGroups: ReportCourseGroup[];
  centralGroups: ReportCentralGroup[];
};

/** Canonical evidence-source key shared with the Analytics dashboards. */
type ReportEvidenceSource = "COURSE_STUDENT" | "CENTRAL_STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER";

export const REPORT_EVIDENCE_SOURCE_LABELS: Record<ReportEvidenceSource, string> = {
  COURSE_STUDENT: "Course-bound student",
  CENTRAL_STUDENT: "Program-wide student",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry partner",
};

/** Program-wide evidence keeps its respondent category separate from sources. */
export function reportCentralSourceLabel(stakeholder: TargetStakeholder): ReportEvidenceSource {
  if (stakeholder === Stakeholder.ALUMNI) return "ALUMNI";
  if (stakeholder === Stakeholder.INDUSTRY_PARTNER) return "INDUSTRY_PARTNER";
  return "CENTRAL_STUDENT";
}

export const REPORT_STAKEHOLDER_LABELS: Record<TargetStakeholder, string> = {
  STUDENT: "Student",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry partner",
};

export const REPORT_MANIFESTATION_LABELS: Record<CILOMappingManifestation, string> = {
  LEARNING: "Learning",
  PRACTICE: "Practice",
  OPPORTUNITY: "Opportunity",
};

export const ATTAINMENT_STATUS_LABELS = {
  noEvidence: "No evidence",
  unsupportedScale: "Unclassified — unsupported scale",
  mixedScales: "Unclassified — mixed scales",
} as const;

/** One export shape and the file it downloads as. */
export type ReportExportKind =
  | "COURSE_WORKBOOK"
  | "PROGRAM_OUTCOME_WORKBOOK"
  | "RAW_QUANTITATIVE_CSV";

export const REPORT_EXPORT_LABELS: Record<ReportExportKind, string> = {
  COURSE_WORKBOOK: "Course evaluation workbook",
  PROGRAM_OUTCOME_WORKBOOK: "Program Outcome report",
  RAW_QUANTITATIVE_CSV: "Raw quantitative CSV",
};

/** Respondent account names are confidential but must never be invented. */
export const REPORT_NAME_UNAVAILABLE = "Name unavailable";
