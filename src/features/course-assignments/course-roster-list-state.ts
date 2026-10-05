import { CourseScope, StudentSection, YearLevel } from "@prisma/client";
import { z } from "zod";

import type { CourseRosterAssignmentSummary } from "./types";

/** The role-owned route this state module owns end to end. */
export const COURSE_ROSTER_PATH = "/faculty/course-rosters";

/** The two presentations My Course Rosters can render. */
export type CourseRosterViewMode = "list" | "card";

/**
 * Which academic history the discovery list reads. `current` is the default
 * and means active Course assignments in the active Academic Period; `term`
 * narrows to one period whatever its lifecycle; `all` drops the lifecycle
 * constraint entirely and is what the retired history checkbox selected.
 */
export type CourseRosterPeriodScope =
  | { mode: "current" }
  | { mode: "all" }
  | { mode: "term"; termInstanceId: string };

export type CourseRosterFilterState = {
  period: CourseRosterPeriodScope;
  courseId: string | null;
  programId: string | null;
  yearLevel: YearLevel | null;
  section: StudentSection | null;
  courseScope: CourseScope | null;
  search: string;
};

/**
 * What the discovery list actually renders. The server also echoes the resolved
 * period scope and page, which the route uses for canonicalization rather than
 * the component.
 */
export type CourseRosterDiscoveryData = {
  items: CourseRosterAssignmentSummary[];
  total: number;
  /** 0-based, matching the server. */
  page: number;
  pageSize: number;
  search: string;
  activePeriodId: string | null;
};

type CourseRosterListUrlState = {
  /** 1-based, matching the `page` search param. */
  page: number;
  view: CourseRosterViewMode;
  filters: CourseRosterFilterState;
};

export const DEFAULT_COURSE_ROSTER_FILTERS: CourseRosterFilterState = {
  period: { mode: "current" },
  courseId: null,
  programId: null,
  yearLevel: null,
  section: null,
  courseScope: null,
  search: "",
};

type CourseRosterSearchParams = Record<string, string | string[] | undefined>;

const MAX_PAGE = 10_000;
const MAX_QUERY_LENGTH = 100;

/** The Academic Period picker's value for the active-period scope. */
export const ACTIVE_PERIOD_SENTINEL = "current";

const uuidSchema = z.string().uuid();
const pageSchema = z.coerce.number().int().min(1).max(MAX_PAGE);
const yearLevelSchema = z.enum([
  YearLevel.FIRST_YEAR,
  YearLevel.SECOND_YEAR,
  YearLevel.THIRD_YEAR,
  YearLevel.FOURTH_YEAR,
]);
const sectionSchema = z.enum([
  StudentSection.MORNING,
  StudentSection.AFTERNOON,
  StudentSection.EVENING,
]);
const courseScopeSchema = z.enum([CourseScope.GENERAL_EDUCATION, CourseScope.PROGRAM_SPECIFIC]);
const viewSchema = z.enum(["list", "card"]);

function firstNonEmptyValue(value: string | string[] | undefined): string | undefined {
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((candidate): candidate is string => typeof candidate === "string")
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.length > 0);
}

function parseOptional<T>(
  value: string | string[] | undefined,
  schema: z.ZodType<T>
): T | undefined {
  const candidate = firstNonEmptyValue(value);
  if (candidate === undefined) return undefined;
  const parsed = schema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

function parseQuery(value: string | string[] | undefined): string {
  const candidate = firstNonEmptyValue(value);
  return !candidate || candidate.length > MAX_QUERY_LENGTH ? "" : candidate;
}

/**
 * `period` carries all three scopes. Anything unrecognised falls back to the
 * default rather than widening the read. The retired `history=1` param is read
 * as `all` so existing links and bookmarks keep resolving.
 */
function parseCourseRosterPeriod(
  period: string | string[] | undefined,
  legacyHistory: string | string[] | undefined
): CourseRosterPeriodScope {
  const candidate = firstNonEmptyValue(period);
  if (candidate === "all") return { mode: "all" };
  if (candidate === "current") return { mode: "current" };
  const termInstanceId = parseOptional(period, uuidSchema);
  if (termInstanceId) return { mode: "term", termInstanceId };
  if (candidate) return { mode: "current" };
  return firstNonEmptyValue(legacyHistory) === "1" ? { mode: "all" } : { mode: "current" };
}

export function parseCourseRosterListState(
  rawSearchParams: CourseRosterSearchParams
): CourseRosterListUrlState {
  return {
    page: parseOptional(rawSearchParams.page, pageSchema) ?? 1,
    view: parseOptional(rawSearchParams.view, viewSchema) ?? "list",
    filters: {
      period: parseCourseRosterPeriod(rawSearchParams.period, rawSearchParams.history),
      courseId: parseOptional(rawSearchParams.courseId, uuidSchema) ?? null,
      programId: parseOptional(rawSearchParams.programId, uuidSchema) ?? null,
      yearLevel: parseOptional(rawSearchParams.yearLevel, yearLevelSchema) ?? null,
      section: parseOptional(rawSearchParams.section, sectionSchema) ?? null,
      courseScope: parseOptional(rawSearchParams.courseScope, courseScopeSchema) ?? null,
      search: parseQuery(rawSearchParams.search),
    },
  };
}

export function serializeCourseRosterPeriod(period: CourseRosterPeriodScope): string | undefined {
  if (period.mode === "current") return undefined;
  if (period.mode === "all") return "all";
  return period.termInstanceId;
}

/**
 * The inverse of {@link serializeCourseRosterPeriod}. The picker and the URL
 * both speak period ids plus two sentinels, so the mapping back to a scope
 * lives here rather than in either caller.
 */
export function courseRosterPeriodFromPickerValue(value: string): CourseRosterPeriodScope {
  if (value === "all") return { mode: "all" };
  if (value === ACTIVE_PERIOD_SENTINEL) return { mode: "current" };
  return { mode: "term", termInstanceId: value };
}

export function serializeCourseRosterListState(state: CourseRosterListUrlState): URLSearchParams {
  const params = new URLSearchParams();
  const { filters } = state;

  if (state.page > 1) params.set("page", String(state.page));
  const period = serializeCourseRosterPeriod(filters.period);
  if (period) params.set("period", period);
  if (filters.courseId) params.set("courseId", filters.courseId);
  if (filters.programId) params.set("programId", filters.programId);
  if (filters.yearLevel) params.set("yearLevel", filters.yearLevel);
  if (filters.section) params.set("section", filters.section);
  if (filters.courseScope) params.set("courseScope", filters.courseScope);
  if (filters.search) params.set("search", filters.search);
  if (state.view === "card") params.set("view", "card");

  return params;
}

/**
 * The single URL-to-state mapping both the route and the client filters use, so
 * a client-built href and the route's canonical redirect can never disagree.
 */
export function courseRosterListPath(pathname: string, state: CourseRosterListUrlState): string {
  const query = serializeCourseRosterListState(state).toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function isCanonicalCourseRosterListState(
  rawSearchParams: CourseRosterSearchParams,
  state: CourseRosterListUrlState
): boolean {
  const raw = new URLSearchParams();
  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) raw.append(key, item);
    } else if (value !== undefined) {
      raw.set(key, value);
    }
  }

  return raw.toString() === serializeCourseRosterListState(state).toString();
}

/** Facets that narrow the list beyond the default scope. Drives the active count. */
export function activeCourseRosterFilterCount(filters: CourseRosterFilterState): number {
  return [
    filters.courseId,
    filters.programId,
    filters.yearLevel,
    filters.section,
    filters.courseScope,
    filters.search,
  ].filter((value) => value !== null && value !== "").length;
}

export function hasNonDefaultCourseRosterPeriod(period: CourseRosterPeriodScope): boolean {
  return period.mode !== "current";
}
