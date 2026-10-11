import { CourseScope, StudentSection, YearLevel } from "@prisma/client";

/**
 * The narrowing state the Course-assignment lists carry. The banner that once
 * rendered these facets as a form is gone; the columns own their own controls
 * now, and this stays the single shape every one of them writes through.
 */
export interface AssignmentFiltersState {
  termInstanceId: string | null;
  courseId: string | null;
  facultyId: string | null;
  programId: string | null;
  yearLevel: YearLevel | null;
  section: StudentSection | null;
  isActive: boolean | null;
  courseScope: CourseScope | null;
  hasActiveRosterMembers?: boolean;
  searchQuery: string;
}
