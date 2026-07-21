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
};

/**
 * Input for creating a course assignment.
 */
export type CreateCourseAssignmentInput = {
  termInstanceId: string;
  facultyId: string;
  courseId: string;
  programId: string;
  yearLevel: YearLevel;
  section: StudentSection;
};

/**
 * Input for updating a course assignment.
 */
export type UpdateCourseAssignmentInput = {
  assignmentId: string;
  programId?: string;
  yearLevel?: YearLevel;
  section?: StudentSection;
};

/**
 * Input for deactivating a course assignment.
 */
export type DeactivateCourseAssignmentInput = {
  assignmentId: string;
};

/**
 * Input for activating a course assignment.
 */
export type ActivateCourseAssignmentInput = {
  assignmentId: string;
};

/**
 * Input for deleting a course assignment (hard delete).
 */
export type DeleteCourseAssignmentInput = {
  assignmentId: string;
};

/**
 * Input for bulk creating course assignments.
 */
export type BulkCreateCourseAssignmentsInput = {
  assignments: CreateCourseAssignmentInput[];
};

/**
 * Result of a course assignment operation.
 */
export type CourseAssignmentResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

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
};

/**
 * Pagination options.
 */
export type ListOptions = {
  page?: number;
  pageSize?: number;
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
  firstName: string;
  lastName: string;
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
  errors: Array<{ index: number; error: string }>;
};
