import type {
  AcademicSemester,
  AcademicTerm,
  CurriculumVersionStatus,
  YearLevel,
} from "@prisma/client";

/**
 * A Curriculum Version entity as displayed in lists.
 */
export interface CurriculumVersionItem {
  id: string;
  programId: string;
  majorId: string | null;
  code: string;
  name: string | null;
  status: CurriculumVersionStatus;
  effectiveFromSchoolYearId: string | null;
  publishedAt: Date | null;
  publishedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A single Course placement within a Curriculum Version.
 */
export interface CurriculumCourseItem {
  id: string;
  curriculumVersionId: string;
  courseId: string;
  yearLevel: YearLevel;
  semester: AcademicSemester;
  term: AcademicTerm | null;
  courseCodeSnapshot: string;
  courseTitleSnapshot: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A Curriculum Version as displayed in lists, with its course count.
 */
export interface CurriculumVersionSummaryItem extends CurriculumVersionItem {
  courseCount: number;
}

/**
 * A Program option for curriculum page selectors.
 */
export interface CurriculumPageProgram {
  id: string;
  code: string;
  name: string;
}

/**
 * A Course option for the add-course picker.
 */
export interface CurriculumCourseOption {
  id: string;
  code: string;
  title: string;
  /** Owning program, null for shared General Education courses. */
  programId: string | null;
}

/**
 * A School Year option for the effective school year selector.
 */
export interface SchoolYearOption {
  id: string;
  code: string;
}

/**
 * A Curriculum Version with its courses and program/major context.
 */
export interface CurriculumVersionDetail extends CurriculumVersionItem {
  program: { id: string; code: string; name: string } | null;
  major: { id: string; name: string } | null;
  courses: CurriculumCourseItem[];
}

/**
 * Input for creating a DRAFT Curriculum Version.
 */
export interface CreateCurriculumVersionInput {
  programId: string;
  majorId?: string | null;
  code: string;
  name?: string | null;
  effectiveFromSchoolYearId?: string | null;
}

/**
 * Input for updating a DRAFT Curriculum Version's metadata. Program and major
 * scope are immutable; `name` and `effectiveFromSchoolYearId` accept explicit
 * null to clear the stored value.
 */
export interface UpdateCurriculumVersionInput {
  code?: string;
  name?: string | null;
  effectiveFromSchoolYearId?: string | null;
}

/**
 * Input for adding a Course placement to a DRAFT Curriculum Version.
 */
export interface AddCurriculumCourseInput {
  curriculumVersionId: string;
  courseId: string;
  yearLevel: YearLevel;
  semester: AcademicSemester;
  term?: AcademicTerm | null;
}

/**
 * Input for updating a Course placement within a DRAFT Curriculum Version.
 * The course row is identified by the `id` parameter of
 * {@link updateCurriculumCourse}.
 */
export interface UpdateCurriculumCourseInput {
  yearLevel?: YearLevel;
  semester?: AcademicSemester;
  term?: AcademicTerm | null;
}
