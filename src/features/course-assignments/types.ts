import type { YearLevel, StudentSection, CourseScope } from "@prisma/client";

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
