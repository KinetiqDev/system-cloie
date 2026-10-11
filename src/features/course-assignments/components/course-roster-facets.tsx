"use client";

import { CourseScope, StudentSection, YearLevel } from "@prisma/client";

import { STUDENT_SECTION_OPTIONS, YEAR_LEVEL_OPTIONS } from "@/lib/constants/academic";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import type { FacetDef } from "@/components/data-table/types";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import {
  ACTIVE_PERIOD_SENTINEL,
  hasNonDefaultCourseRosterPeriod,
  serializeCourseRosterPeriod,
  type CourseRosterFilterState,
} from "../course-roster-list-state";
import type { FacultyRosterCourseOption, FacultyRosterProgramOption } from "../types";

export type CourseRosterFacetColumn = "course" | "program" | "class" | "period";

const COURSE_SCOPE_LABELS: Record<CourseScope, string> = {
  [CourseScope.GENERAL_EDUCATION]: "General Education",
  [CourseScope.PROFESSIONAL]: "Professional",
};

/**
 * The narrowing controls for My Course Rosters, expressed once as facets. The
 * Academic Period decides which lifecycle the list reads, so it carries its own
 * column; the remaining facets narrow within it.
 *
 * Course scope sits under the Course heading because this table has no Scope
 * column of its own: the scope is a property of the course the row names.
 */
export function buildCourseRosterFacets(
  filters: CourseRosterFilterState,
  update: <K extends keyof CourseRosterFilterState>(
    key: K,
    value: CourseRosterFilterState[K]
  ) => void,
  options: {
    termInstances: TermInstanceItem[];
    courses: FacultyRosterCourseOption[];
    programs: FacultyRosterProgramOption[];
  }
): { byColumn: Record<CourseRosterFacetColumn, FacetDef[]>; all: FacetDef[] } {
  const course: FacetDef = {
    id: "courseId",
    label: "Course",
    value: filters.courseId,
    onChange: (value) => update("courseId", value),
    allLabel: "All courses",
    searchable: true,
    searchPlaceholder: "Search courses…",
    emptyMessage: "No courses match your search.",
    options: options.courses.map((entry) => ({
      id: entry.id,
      label: entry.code,
      detail: entry.title,
    })),
  };

  const courseScope: FacetDef = {
    id: "courseScope",
    label: "Course scope",
    value: filters.courseScope,
    onChange: (value) => update("courseScope", value as CourseScope | null),
    allLabel: "All scopes",
    options: Object.entries(COURSE_SCOPE_LABELS).map(([id, label]) => ({ id, label })),
  };

  const program: FacetDef = {
    id: "programId",
    label: "Program",
    value: filters.programId,
    onChange: (value) => update("programId", value),
    allLabel: "All programs",
    options: options.programs.map((entry) => ({
      id: entry.id,
      label: entry.code,
      detail: entry.name,
    })),
  };

  const classFacets: FacetDef[] = [
    {
      id: "yearLevel",
      label: "Year level",
      value: filters.yearLevel,
      onChange: (value) => update("yearLevel", value as YearLevel | null),
      allLabel: "All year levels",
      options: YEAR_LEVEL_OPTIONS.map((option) => ({ id: option.value, label: option.label })),
    },
    {
      id: "section",
      label: "Section",
      value: filters.section,
      onChange: (value) => update("section", value as StudentSection | null),
      allLabel: "All sections",
      options: STUDENT_SECTION_OPTIONS.map((option) => ({ id: option.value, label: option.label })),
    },
  ];

  const period: FacetDef = {
    id: "period",
    label: "Academic Period",
    // Active assignments are this list's own scope, so it is the facet's
    // clearing row rather than one more option.
    value: serializeCourseRosterPeriod(filters.period) ?? null,
    isApplied: hasNonDefaultCourseRosterPeriod(filters.period),
    onChange: (value) =>
      update(
        "period",
        value === null || value === ACTIVE_PERIOD_SENTINEL
          ? { mode: "current" }
          : value === "all"
            ? { mode: "all" }
            : { mode: "term", termInstanceId: value }
      ),
    allLabel: "Active assignments",
    searchable: true,
    searchPlaceholder: "Search academic periods…",
    emptyMessage: "No academic periods match your search.",
    options: [
      { id: "all", label: "All academic periods" },
      ...options.termInstances.map((term) => ({
        id: term.id,
        label: formatTermInstanceLabel(term.schoolYearCode, term.semester, term.term),
      })),
    ],
  };
  const byColumn: Record<CourseRosterFacetColumn, FacetDef[]> = {
    course: [course, courseScope],
    program: [program],
    class: classFacets,
    period: [period],
  };

  return { byColumn, all: Object.values(byColumn).flat() };
}
