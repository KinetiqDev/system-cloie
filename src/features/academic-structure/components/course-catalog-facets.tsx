"use client";

import { SEMESTER_OPTIONS, TERM_OPTIONS, YEAR_LEVEL_OPTIONS } from "@/lib/constants/academic";
import type { FacetDef } from "@/components/data-table/types";
import { SCHEDULE_FILTER_ALL } from "./course-schedule-filters";

/**
 * The narrowing controls the Course catalogs share. These lists filter in
 * memory over an already-read page of courses, so each one owns its own state
 * and composes the facets it actually offers.
 */

/** A facet whose value is absent until the operator narrows it. */
function withAll(value: string, allValue: string): string | null {
  return value === allValue ? null : value;
}

export function courseScopeFacet(
  value: string,
  onChange: (value: string | null) => void,
  allValue: string
): FacetDef {
  return {
    id: "scope",
    label: "Scope",
    value: withAll(value, allValue),
    onChange: (next) => onChange(next ?? allValue),
    allLabel: "All scopes",
    options: [
      { id: "program_specific", label: "Program-specific" },
      { id: "general_education", label: "General Education" },
    ],
  };
}

/** The Program Head catalog's Active/Archived lifecycle column. */
export function courseArchiveStatusFacet(
  value: string,
  onChange: (value: string | null) => void,
  allValue: string
): FacetDef {
  return {
    id: "status",
    label: "Status",
    value: withAll(value, allValue),
    onChange: (next) => onChange(next ?? allValue),
    allLabel: "All statuses",
    options: [
      { id: "active", label: "Active" },
      { id: "archived", label: "Archived" },
    ],
  };
}

export function courseProgramFacet(
  value: string,
  onChange: (value: string | null) => void,
  allValue: string,
  programs: Array<{ id: string; code: string; name: string }>
): FacetDef {
  return {
    id: "programId",
    label: "Program",
    value: withAll(value, allValue),
    onChange: (next) => onChange(next ?? allValue),
    allLabel: "All programs",
    searchable: programs.length >= 12,
    searchPlaceholder: "Search programs…",
    emptyMessage: "No programs match your search.",
    options: programs.map((program) => ({
      id: program.id,
      label: program.code,
      detail: program.name,
    })),
  };
}

export function courseMajorFacet(
  value: string,
  onChange: (value: string | null) => void,
  allValue: string,
  majors: Array<{ id: string; name: string }>
): FacetDef {
  return {
    id: "majorId",
    label: "Major",
    value: withAll(value, allValue),
    onChange: (next) => onChange(next ?? allValue),
    allLabel: "All majors",
    // A Major only exists inside a Program, so the facet explains itself
    // rather than silently disappearing when none is chosen.
    disabled: majors.length === 0,
    disabledReason: "Choose a Program that has majors to narrow by one.",
    options: majors.map((major) => ({ id: major.id, label: major.name })),
  };
}

/**
 * The three placement facets a course carries by default. Year level,
 * Semester, and Term are separate columns, so each gets its own control.
 */
export function courseScheduleFacets(
  values: { yearLevel: string; semester: string; term: string },
  onChange: (key: "yearLevel" | "semester" | "term", value: string | null) => void,
  allValue: string
): { yearLevel: FacetDef; semester: FacetDef; term: FacetDef } {
  const isSummer = values.semester === "SUMMER";
  return {
    yearLevel: {
      id: "yearLevel",
      label: "Year level",
      value: withAll(values.yearLevel, allValue),
      onChange: (next) => onChange("yearLevel", next),
      allLabel: "All year levels",
      options: YEAR_LEVEL_OPTIONS.map((option) => ({ id: option.value, label: option.label })),
    },
    semester: {
      id: "semester",
      label: "Semester",
      value: withAll(values.semester, allValue),
      onChange: (next) => onChange("semester", next),
      allLabel: "All semesters",
      options: SEMESTER_OPTIONS.map((option) => ({ id: option.value, label: option.label })),
    },
    term: {
      id: "term",
      label: "Term",
      value: withAll(values.term, allValue),
      onChange: (next) => onChange("term", next),
      allLabel: "All terms",
      // Summer has no Terms, so the facet says so instead of offering a list
      // that can only produce an empty result.
      disabled: isSummer,
      disabledReason: "The Summer semester has no terms.",
      options: TERM_OPTIONS.map((option) => ({ id: option.value, label: option.label })),
    },
  };
}

/** The clearing value these facets share, re-exported for their callers. */
export { SCHEDULE_FILTER_ALL };
