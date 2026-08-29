import {
  AcademicSemester,
  CourseBoundEvaluationExclusionCategory,
  CourseBoundEvaluationExclusionReversalCategory,
  CourseScope,
  DeploymentStatus,
  StudentSection,
  TargetStakeholder,
  YearLevel,
} from "@prisma/client";
import { type ServiceResult } from "@/lib/utils/service-result";

export type { StudentSection };

export type FacultyCourseContext = {
  courseCode: string;
  courseId: string;
  courseTitle: string;
  courseType: CourseScope;
  majorId: string | null;
  majorName: string | null;
  programCode: string;
  programId: string;
  programName: string;
  scopeLabel: string;
};

export type FacultyManagedCiloContext = {
  courseId: string;
  majorId: string | null;
  programId: string;
};

export type FacultyManagedCiloItem = {
  description: string;
  id: string;
};

export type FacultyManagedCiloLoadResult = ServiceResult<{
  hasSavedCilos: boolean;
  items: FacultyManagedCiloItem[];
}>;

export type FacultyManagedCiloSaveInput = FacultyManagedCiloContext & {
  items: Array<{ id?: string; description: string }>;
};

export type FacultyManagedCiloSaveResult = ServiceResult<{
  items: FacultyManagedCiloItem[];
}>;

export type CourseBoundPublicationCiloInput = {
  description: string;
  id: string;
};

export type CourseBoundCiloQuestionBindingInput = {
  ciloId: string;
  itemKey: string;
  sectionKey: string;
};

/**
 * Phase 9: Simplified input using course assignment ID.
 * All class identity (term, program, year level, section) is resolved from the assignment.
 * The authenticated session supplies the publication actor.
 */
export type PublishCourseBoundEvaluationInput = {
  assignmentId: string;
  activationAt?: Date | null;
  deadlineAt?: Date | null;
  deploymentName: string;
  exclusions?: CourseBoundEvaluationExclusionInput[];
  programId?: string;
  templateId: string;
};

export type CourseBoundEvaluationExclusionInput = {
  category: CourseBoundEvaluationExclusionCategory;
  membershipId: string;
  otherExplanation?: string;
};

export type LateIncludeCourseBoundEvaluationInput = {
  evaluationId: string;
  membershipId: string;
  programId?: string;
  reversalCategory: CourseBoundEvaluationExclusionReversalCategory;
  reversalOtherExplanation?: string;
};

export type LateIncludeCourseBoundEvaluationResult =
  | { success: true; data: { message: string } }
  | { success: false; error: string; referenceId?: string };

export type PublishCourseBoundEvaluationResult =
  | {
      success: true;
      data: {
        assignmentCount: number;
        evaluationId: string;
        status: "ACTIVE" | "SCHEDULED";
        targetCount: number;
      };
    }
  | {
      success: false;
      error: string;
      referenceId?: string;
      /** Present when the publisher is Faculty and the Course alignment repair route applies. */
      alignmentCourseId?: string;
    };

// ============================================================================
// Preview Respondents (Step 2 of publish flow)
// ============================================================================

export type PreviewRespondent = {
  email: string;
  majorId: string | null;
  majorName: string | null;
  membershipId: string;
  /** Canonical opaque account name (ADR 0014). */
  name: string;
  programCode: string;
  programId: string;
  programName: string;
  section: StudentSection | null;
  userId: string;
  yearLevel: YearLevel;
};

/**
 * Phase 9: Simplified preview input using course assignment ID.
 */
export type PreviewCourseBoundRespondentsInput = {
  assignmentId: string;
  programId?: string;
};

export type PreviewCourseBoundRespondentsResult =
  | { success: true; data: PreviewRespondent[] }
  | { success: false; error: string; referenceId?: string };

// ============================================================================
// Faculty Published Evaluations
// ============================================================================

export type FacultyPublishedEvaluationItem = {
  termInstanceLabel: string;
  activationAt: Date | null;
  courseCode: string;
  courseId: string;
  courseTitle: string;
  courseScope: CourseScope;
  deadlineAt: Date | null;
  deploymentName: string;
  evaluationId: string;
  majorId: string | null;
  majorName: string | null;
  programCode: string;
  programId: string;
  programName: string;
  publishedAt: Date | null;
  responseCount: number;
  status: DeploymentStatus;
  targetYearLevels: YearLevel[];
  totalAssignments: number;
};

export type FacultyPublishedEvaluationCiloBinding = {
  ciloDescriptionSnapshot: string;
  ciloId: string | null;
  itemKey: string;
  questionPromptSnapshot: string;
  sectionKey: string;
};

export type FacultyPublishedEvaluationTarget = {
  programCode: string;
  programId: string;
  yearLevel: YearLevel | null;
};

export type FacultyEvaluationRespondentStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";

export type FacultyEvaluationRespondent = {
  assignedAt: Date;
  assignmentId: string;
  email: string;
  name: string;
  respondentId: string;
  status: FacultyEvaluationRespondentStatus;
  submittedAt: Date | null;
};

type FacultyPublishedInstrumentQuestion = {
  itemKey: string;
  likertDescriptors: Array<{ label: string; value: number }>;
  prompt: string;
  required: boolean;
  suggestedResponses: string[];
  type: "likert" | "guided_open_ended";
};

type FacultyPublishedInstrumentSection = {
  description: string | null;
  questions: FacultyPublishedInstrumentQuestion[];
  sectionKey: string;
  title: string;
};

export type FacultyEvaluationDetail = {
  termInstanceLabel: string;
  activationAt: Date | null;
  cilos: Array<{
    description: string;
    id: string;
    label: string;
  }>;
  courseInfo: {
    courseCode: string;
    courseScope: string;
    courseTitle: string;
    majorName: string | null;
    programCode: string;
    programName: string;
  };
  deadlineAt: Date | null;
  deploymentName: string;
  evaluationId: string;
  publishedAt: Date | null;
  responseCount: number;
  status: DeploymentStatus;
  targets: FacultyPublishedEvaluationTarget[];
  templateBindings: FacultyPublishedEvaluationCiloBinding[];
  totalAssignments: number;
  inProgressCount: number;
  notStartedCount: number;
  respondents: FacultyEvaluationRespondent[];
  instrument: {
    name: string;
    sections: FacultyPublishedInstrumentSection[];
    versionNumber: number;
  };
  exclusions: Array<{
    category: CourseBoundEvaluationExclusionCategory;
    membershipId: string;
    membershipActive: boolean;
    reversalCategory: CourseBoundEvaluationExclusionReversalCategory | null;
    reversedAt: Date | null;
    studentName: string;
  }>;
  lateInclusionOpen: boolean;
};

export type ListFacultyPublishedEvaluationsResult = ServiceResult<{
  evaluations: FacultyPublishedEvaluationItem[];
  program: { code: string; id: string; name: string };
}>;

export type GetFacultyEvaluationDetailResult = ServiceResult<FacultyEvaluationDetail>;

export type CloseFacultyEvaluationResult = ServiceResult;

// ============================================================================
// Preview Central Deployment Respondents (Program Head publish flow)
// ============================================================================

/**
 * @deprecated Use PreviewCentralDeploymentInput with termInstanceId instead.
 * Legacy input kept for backward compatibility during Phase 7 transition.
 */
export type PreviewCentralDeploymentInputLegacy = {
  academicYear: string;
  majorId?: string;
  programId: string;
  targetStakeholder: TargetStakeholder;
  yearLevel?: YearLevel;
};

/**
 * Phase 7: Preview input supporting term instance ID for enrollment-based lookup.
 * Either termInstanceId OR academicYear should be provided.
 */
export type PreviewCentralDeploymentInput = {
  // Phase 7: term instance is the preferred way
  termInstanceId?: string;
  // Legacy fields (optional during transition)
  academicYear?: string;
  semester?: AcademicSemester;
  majorId?: string;
  programId: string;
  targetStakeholder: TargetStakeholder;
  yearLevel?: YearLevel;
};

export type PreviewCentralDeploymentRespondent = {
  email: string;
  majorName: string | null;
  /** Canonical opaque account name (ADR 0014). */
  name: string;
  programCode: string | null;
  stakeholderType: TargetStakeholder;
  userId: string;
  yearLevel: YearLevel | null;
};

export type PreviewCentralDeploymentResult = ServiceResult<PreviewCentralDeploymentRespondent[]>;
