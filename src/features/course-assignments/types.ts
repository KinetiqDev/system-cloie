import type { AcademicPeriodStatus, CourseScope, StudentSection, YearLevel } from "@prisma/client";

/**
 * Course option surfaced by the course assignment route and dialogs.
 * Includes catalog defaults and scope so the UI can pre-fill and distinguish GE courses.
 */
export type AssignableCourse = {
  id: string;
  code: string;
  title: string;
  default_year_level: YearLevel | null;
  course_scope: CourseScope;
  program_id: string | null;
};

/**
 * Course assignment record with related data.
 */
export type CourseAssignmentItem = {
  id: string;
  termInstanceId: string;
  facultyId: string;
  courseId: string;
  programId: string;
  yearLevel: YearLevel;
  section: StudentSection;
  assignedBy: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Hydrated fields
  facultyName?: string;
  facultyEmail?: string;
  courseCode?: string;
  courseTitle?: string;
  courseScope?: CourseScope;
  programCode?: string;
  programName?: string;
  termLabel?: string;
  lastTermTaught?: string;
  rosterMembershipCount?: number;
};

/**
 * Input for creating a course assignment.
 */
export type CreateCourseAssignmentInput = {
  termInstanceId: string;
  facultyId: string;
  courseId: string;
  programId: string;
  yearLevel?: YearLevel;
  section: StudentSection;
  curriculumCourseId?: string | null;
  selectedProgramId?: string;
};

/**
 * Input for updating a course assignment.
 */
export type UpdateCourseAssignmentInput = {
  assignmentId: string;
  programId?: string;
  selectedProgramId?: string;
  yearLevel?: YearLevel;
  section?: StudentSection;
  facultyId?: string;
};

/**
 * Input for deactivating a course assignment.
 */
export type DeactivateCourseAssignmentInput = {
  assignmentId: string;
  programId?: string;
};

/**
 * Input for activating a course assignment.
 */
export type ActivateCourseAssignmentInput = {
  assignmentId: string;
  programId?: string;
};

/**
 * Input for deleting a course assignment (hard delete).
 */
export type DeleteCourseAssignmentInput = {
  assignmentId: string;
  programId?: string;
  confirmationLabel: string;
  revision: string;
  membershipCount: number;
  activeMembershipCount: number;
  removedMembershipCount: number;
};

export type CourseAssignmentDeletionPreflight = {
  id: string;
  label: string;
  revision: string;
  membershipCount: number;
  activeMembershipCount: number;
  removedMembershipCount: number;
  courseBoundEvaluationCount: number;
};

/**
 * Input for bulk creating course assignments.
 */
export type BulkCreateCourseAssignmentsInput = {
  assignments: CreateCourseAssignmentInput[];
  selectedProgramId?: string;
};

/**
 * Result of a course assignment operation.
 */
export type CourseAssignmentResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; referenceId?: string };

export type CourseAssignmentMutationData = { programIds: string[] };

export type RosterEligibilityReason =
  | "UNKNOWN_ACCOUNT"
  | "NON_STUDENT_ACCOUNT"
  | "ACCOUNT_INACTIVE"
  | "PROFILE_INCOMPLETE"
  | "NO_ACTIVE_TERM_PLACEMENT"
  | "PROGRAM_MISMATCH";

export type RosterEligibilityProjection = {
  eligible: boolean;
  reason: RosterEligibilityReason | null;
};

export type RosterState =
  | "ACTIVE"
  | "INACTIVE_ASSIGNMENT"
  | "INACTIVE_ACADEMIC_PERIOD"
  | "PUBLISHED_EVALUATION_LOCK";

export type CourseRosterAssignmentSummary = {
  assignmentId: string;
  courseCode: string;
  courseTitle: string;
  courseScope: CourseScope;
  programCode: string;
  programName: string;
  facultyName: string;
  facultyEmail: string;
  yearLevel: YearLevel;
  section: StudentSection;
  termLabel: string;
  periodStatus: AcademicPeriodStatus;
  isActive: boolean;
  hasPublishedEvaluation: boolean;
  rosterState: RosterState;
  activeRosterCount: number;
  evaluationEligibleCount: number;
};

export type CourseRosterDiscoveryResult = {
  items: CourseRosterAssignmentSummary[];
  total: number;
  page: number;
  pageSize: number;
  includeHistory: boolean;
  search: string;
  activePeriodId: string | null;
};

export type CourseRosterMember = {
  membershipId: string;
  studentName: string;
  email: string;
  programCode: string | null;
  programName: string | null;
  majorName: string | null;
  yearLevel: YearLevel;
  section: StudentSection;
  membershipAddedAt: Date;
  isActive: boolean;
  eligibility: RosterEligibilityProjection;
  removedAt: Date | null;
  removedByName: string | null;
};

export type CourseRosterDetail = {
  assignment: CourseRosterAssignmentSummary;
  canManage: boolean;
  canMutate: boolean;
  members: CourseRosterMember[];
  totalMembers: number;
  activeRosterCount: number;
  evaluationEligibleCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  includeRemoved: boolean;
  sortDirection: "asc" | "desc";
};

export type RosterMutabilityReason =
  | "INACTIVE_ASSIGNMENT"
  | "INACTIVE_ACADEMIC_PERIOD"
  | "PUBLISHED_EVALUATION_LOCK";

export type CourseRosterPreviewResolution =
  | { status: "EXACT_MATCH"; reason: "EXACT"; candidateIds: string[] }
  | {
      status: "SUGGESTED_MATCH";
      reason: "MIDDLE_TOKEN" | "INITIAL" | "SEPARATOR_PUNCTUATION" | "SUFFIX" | "DIACRITIC";
      candidateIds: string[];
    }
  | { status: "AMBIGUOUS"; reason: "EQUAL_TIER"; candidateIds: string[] }
  | { status: "NO_MATCH"; reason: "NO_EVIDENCE"; candidateIds: [] }
  | { status: "INVALID_NAME"; reason: "INVALID"; candidateIds: [] };

export type CourseRosterPreviewDisposition =
  | "READY_CREATE"
  | "WILL_RESTORE"
  | "ALREADY_ACTIVE"
  | "INELIGIBLE"
  | "OTHER_SECTION_CONFLICT";

export type CourseRosterPreviewCandidate = {
  userId: string;
  name: string;
  email: string;
  programId: string;
  selectable: boolean;
  reason: string | null;
};

export type CourseRosterPreviewRow = {
  sourceIndex: number;
  submittedName: string;
  resolution: CourseRosterPreviewResolution;
  disposition: CourseRosterPreviewDisposition | null;
  candidates: CourseRosterPreviewCandidate[];
};

// Public preview contract; consumers are the scoped candidate search
// (#395) and the reconciliation workspace (#396).
// fallow-ignore-next-line unused-type
export type CourseRosterPreviewSummary = {
  readyToCreate: number;
  willRestore: number;
  alreadyActive: number;
  needsReview: number;
  ineligible: number;
};

export type CourseRosterPreview = {
  assignmentId: string;
  rows: CourseRosterPreviewRow[];
  summary: CourseRosterPreviewSummary;
};

export type CourseRosterMutationOutcome = "CREATED" | "RESTORED" | "REMOVED";

export type CourseRosterMutation = {
  outcome: CourseRosterMutationOutcome;
  message: string;
};

export type CourseRosterImportRowStatus =
  | "PARSED"
  | "INVALID_NAME";

export type CourseRosterImportRow = {
  sourceIndex: number;
  name: string;
  status: CourseRosterImportRowStatus;
  error: string;
};

export type CourseRosterImportSummary = {
  total: number;
  parsed: number;
  invalid: number;
  rows: CourseRosterImportRow[];
};

export type AuthorizedRosterAssignment = {
  assignmentId: string;
  facultyId: string;
  courseId: string;
  programId: string;
  termInstanceId: string;
  courseScope: CourseScope;
  isActive: boolean;
  periodStatus: AcademicPeriodStatus;
  hasPublishedEvaluation: boolean;
  canManage: boolean;
  canMutate: boolean;
  mutabilityReason: RosterMutabilityReason | null;
};

export type RosterServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; referenceId?: string };

/**
 * Filter options for listing course assignments.
 */
export type ListCourseAssignmentsFilter = {
  termInstanceId?: string;
  courseId?: string;
  facultyId?: string;
  programId?: string;
  yearLevel?: YearLevel;
  section?: StudentSection;
  isActive?: boolean;
  courseScope?: CourseScope;
  q?: string;
};

/**
 * Pagination options.
 */
export type ListOptions = {
  page?: number;
  pageSize?: number;
  programId?: string;
};

/**
 * Result of listing course assignments.
 */
export type ListCourseAssignmentsResult = {
  items: CourseAssignmentItem[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Faculty search result item.
 */
export type FacultySearchResult = {
  id: string;
  email: string;
  /** Opaque canonical account name (ADR 0014). No first/last aliases. */
  name: string;
  primaryAffiliation?: string;
  primaryAffiliationCode?: string;
  affiliations: string[];
};

/**
 * Bulk creation result.
 */
export type BulkCreateResult = {
  success: boolean;
  created: number;
  errors: Array<{ index: number; error: string; referenceId?: string }>;
};
