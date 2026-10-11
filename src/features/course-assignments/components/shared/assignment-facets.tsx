"use client";

import { CourseScope, StudentSection, YearLevel } from "@prisma/client";

import { STUDENT_SECTION_OPTIONS, YEAR_LEVEL_OPTIONS } from "@/lib/constants/academic";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import type { FacetDef } from "@/components/data-table/types";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import type { AssignmentFiltersState } from "./assignment-filters";

type FacetOptions = {
  availableCourses: Array<{ id: string; code: string; title: string }>;
  availablePrograms: Array<{ id: string; code: string; name: string }>;
  availableFaculty: Array<{ id: string; name: string; email: string; programCodes: string[] }>;
  termInstances: TermInstanceItem[];
  showProgramFilter: boolean;
  hideCourseScopeFilter: boolean;
  /** Role default the Period facet falls back to when it is cleared. */
  defaultTermInstanceId: string | null;
};

const COURSE_SCOPE_LABELS: Record<CourseScope, string> = {
  [CourseScope.GENERAL_EDUCATION]: "General Education",
  [CourseScope.PROFESSIONAL]: "Professional",
};

type AssignmentFacetColumn =
  | "course"
  | "faculty"
  | "program"
  | "class"
  | "term"
  | "scope"
  | "status"
  | "roster";

/**
 * Every narrowing control the Course-assignment lists offer, expressed once as
 * facets. The column headings, the toolbar chips and the mobile sheet all read
 * from this, so no control can drift from its siblings.
 *
 * Search is deliberately absent: it spans Course, Faculty and Program, so it
 * belongs to the toolbar rather than to any one column.
 */
export function buildAssignmentFacets(
  state: AssignmentFiltersState,
  update: <K extends keyof AssignmentFiltersState>(
    key: K,
    value: AssignmentFiltersState[K]
  ) => void,
  options: FacetOptions
): {
  byColumn: Record<AssignmentFacetColumn, FacetDef[]>;
  all: FacetDef[];
} {
  const course: FacetDef = {
    id: "courseId",
    label: "Course",
    value: state.courseId,
    onChange: (value) => update("courseId", value),
    allLabel: "All courses",
    searchable: true,
    searchPlaceholder: "Search courses…",
    emptyMessage: "No courses match your search.",
    options: options.availableCourses.map((entry) => ({
      id: entry.id,
      label: entry.code,
      detail: entry.title,
    })),
  };

  const faculty: FacetDef = {
    id: "facultyId",
    label: "Faculty",
    value: state.facultyId,
    onChange: (value) => update("facultyId", value),
    allLabel: "All faculty",
    searchable: true,
    searchPlaceholder: "Search faculty…",
    emptyMessage: "No faculty match your search.",
    options: options.availableFaculty.map((entry) => ({
      id: entry.id,
      label: entry.name,
      detail: entry.email,
      badges: entry.programCodes,
    })),
  };

  const program: FacetDef = {
    id: "programId",
    label: "Program",
    value: options.showProgramFilter ? state.programId : null,
    onChange: (value) => update("programId", value),
    allLabel: "All programs",
    disabled: !options.showProgramFilter,
    disabledReason: "Every assignment here already belongs to this Program.",
    options: options.availablePrograms.map((entry) => ({
      id: entry.id,
      label: entry.code,
      detail: entry.name,
    })),
  };

  // The Class column carries two facts, so it offers two labelled facets.
  const classFacets: FacetDef[] = [
    {
      id: "yearLevel",
      label: "Year level",
      value: state.yearLevel,
      onChange: (value) => update("yearLevel", value as YearLevel | null),
      allLabel: "All year levels",
      options: YEAR_LEVEL_OPTIONS.map((option) => ({ id: option.value, label: option.label })),
    },
    {
      id: "section",
      label: "Section",
      value: state.section,
      onChange: (value) => update("section", value as StudentSection | null),
      allLabel: "All sections",
      options: STUDENT_SECTION_OPTIONS.map((option) => ({ id: option.value, label: option.label })),
    },
  ];

  const period: FacetDef = {
    id: "termInstanceId",
    label: "Academic Period",
    value: state.termInstanceId,
    // The role's own default period is already in force without being a
    // filter, so it only counts once the operator picks something else. Roles
    // without a default period pass null, and an absent value equals it.
    isApplied: (state.termInstanceId ?? null) !== (options.defaultTermInstanceId ?? null),
    onChange: (value) => update("termInstanceId", value),
    allLabel: "All academic periods",
    searchable: true,
    searchPlaceholder: "Search academic periods…",
    emptyMessage: "No academic periods match your search.",
    options: options.termInstances.map((term) => ({
      id: term.id,
      label: formatTermInstanceLabel(term.schoolYearCode, term.semester, term.term),
    })),
  };

  const scope: FacetDef = {
    id: "courseScope",
    label: "Course scope",
    value: state.courseScope,
    onChange: (value) => update("courseScope", value as CourseScope | null),
    allLabel: "All scopes",
    disabled: options.hideCourseScopeFilter,
    disabledReason: "Every assignment here is General Education.",
    options: Object.entries(COURSE_SCOPE_LABELS).map(([id, label]) => ({ id, label })),
  };

  const status: FacetDef = {
    id: "isActive",
    label: "Status",
    value: state.isActive === null ? null : String(state.isActive),
    onChange: (value) => update("isActive", value === null ? null : value === "true"),
    allLabel: "All statuses",
    options: [
      { id: "true", label: "Active" },
      { id: "false", label: "Inactive" },
    ],
  };

  const roster: FacetDef = {
    id: "roster",
    label: "Roster",
    kind: "toggle",
    value: state.hasActiveRosterMembers === false ? "empty" : null,
    onValue: "empty",
    onChange: (value) => update("hasActiveRosterMembers", value === "empty" ? false : undefined),
    toggleLabel: "Only classes with no active members",
    // The empty-roster scope is an all-program concern: the server reads the
    // parameter for those roles only, and the Program Head's list is already
    // scoped to one Program, so offering it there would change nothing.
    disabled: !options.showProgramFilter,
    disabledReason: "Every class in this Program is listed already.",
  };

  const byColumn: Record<AssignmentFacetColumn, FacetDef[]> = {
    course: [course],
    faculty: [faculty],
    program: [program],
    class: classFacets,
    term: [period],
    scope: [scope],
    status: [status],
    roster: [roster],
  };

  return { byColumn, all: Object.values(byColumn).flat() };
}
