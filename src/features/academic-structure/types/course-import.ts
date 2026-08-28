import type { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";

export const COURSE_IMPORT_MAX_ROWS = 100;

export type CourseImportMode = "secretary" | "program-head" | "general-education";

type CourseImportSourceRow = {
  sourceIndex: number;
};

type SecretaryCourseImportRow = CourseImportSourceRow & {
  course_code: string;
  course_title: string;
  course_scope: string;
  program_code: string;
  major_name: string;
  year_level: string;
  semester: string;
  term: string;
};

type ProgramHeadCourseImportRow = CourseImportSourceRow & {
  course_code: string;
  course_title: string;
  course_type: string;
  major_name: string;
  year_level: string;
  semester: string;
  term: string;
};

type GeneralEducationCourseImportRow = CourseImportSourceRow & {
  course_code: string;
  course_title: string;
  year_level: string;
  semester: string;
  term: string;
};

export type ParsedCourseImportRow =
  | SecretaryCourseImportRow
  | ProgramHeadCourseImportRow
  | GeneralEducationCourseImportRow;

export type CourseImportParseResult =
  | { success: true; rows: ParsedCourseImportRow[] }
  | { success: false; error: string };

export type CourseImportRowStatus =
  | "READY"
  | "INVALID"
  | "DUPLICATE_IN_FILE"
  | "DUPLICATE_EXISTING"
  | "UNKNOWN_PROGRAM"
  | "INACTIVE_PROGRAM"
  | "UNKNOWN_MAJOR"
  | "INACTIVE_MAJOR"
  | "MAJOR_PROGRAM_MISMATCH"
  | "OUT_OF_SCOPE";

export type CourseImportConfirmationOutcome =
  | "CREATED"
  | Exclude<CourseImportRowStatus, "READY">
  | "UNEXPECTED_FAILURE"
  | "UNPROCESSED";

export type CourseImportCatalogOption = {
  id: string;
  code: string;
  name: string;
};

export type CourseImportPreviewRow = {
  sourceIndex: number;
  input: Record<string, string>;
  courseCode: string;
  courseTitle: string;
  courseScope: CourseScope | null;
  courseType: string | null;
  programCode: string | null;
  programName: string | null;
  majorName: string | null;
  yearLevel: YearLevel | null;
  semester: AcademicSemester | null;
  term: AcademicTerm | null;
  status: CourseImportRowStatus;
  error: string | null;
};

export type CourseImportConfirmationRow = CourseImportPreviewRow & {
  outcome: CourseImportConfirmationOutcome;
};

export type CourseImportSummary = {
  total: number;
  ready: number;
  attention: number;
  created: number;
  notCreated: number;
  notProcessed: number;
};

export type CourseImportPreview = {
  rows: CourseImportPreviewRow[];
  summary: CourseImportSummary;
};

export type CourseImportConfirmation = {
  rows: CourseImportConfirmationRow[];
  summary: CourseImportSummary;
};

export type CourseImportModeConfig =
  | {
      mode: "secretary";
      programs: CourseImportCatalogOption[];
    }
  | {
      mode: "program-head";
      selectedProgram: CourseImportCatalogOption;
      majors: CourseImportCatalogOption[];
    }
  | {
      mode: "general-education";
    };

export const COURSE_IMPORT_MODE_LABELS: Record<CourseImportMode, string> = {
  secretary: "General Education and Program-specific Courses",
  "program-head": "Program-specific Courses",
  "general-education": "College-wide General Education Courses",
};
