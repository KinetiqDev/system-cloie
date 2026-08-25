import { CourseScope, StudentSection, YearLevel } from "@prisma/client";
import { z } from "zod";
import type { ListCourseAssignmentsFilter } from "./types";

export type CourseAssignmentListRole = "all-program" | "program-head" | "general-education";

export type CourseAssignmentListUrlState = {
  page: number;
  filters: ListCourseAssignmentsFilter;
  isActiveMode?: "all";
  termInstanceMode?: "all";
};

export function toAssignmentFiltersState(state: CourseAssignmentListUrlState): {
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
} {
  return {
    termInstanceId: state.filters.termInstanceId ?? null,
    courseId: state.filters.courseId ?? null,
    facultyId: state.filters.facultyId ?? null,
    programId: state.filters.programId ?? null,
    yearLevel: state.filters.yearLevel ?? null,
    section: state.filters.section ?? null,
    isActive: state.isActiveMode === "all" ? null : (state.filters.isActive ?? null),
    courseScope: state.filters.courseScope ?? null,
    searchQuery: state.filters.q ?? "",
    hasActiveRosterMembers: state.filters.hasActiveRosterMembers,
  };
}

export type CourseAssignmentSearchParams = Record<string, string | string[] | undefined>;

const MAX_PAGE = 10_000;
const MAX_QUERY_LENGTH = 100;
const queryKeys = [
  "page",
  "termInstanceId",
  "courseId",
  "facultyId",
  "programId",
  "yearLevel",
  "section",
  "courseScope",
  "isActive",
  "roster",
  "q",
] as const;

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

function parseBoolean(value: string | string[] | undefined): boolean | undefined {
  const candidate = firstNonEmptyValue(value);
  if (candidate === "true") return true;
  if (candidate === "false") return false;
  return undefined;
}

function parseQuery(value: string | string[] | undefined): string | undefined {
  const candidate = firstNonEmptyValue(value);
  if (!candidate || candidate.length > MAX_QUERY_LENGTH) return undefined;
  return candidate;
}

function roleDefaultIsActive(role: CourseAssignmentListRole): boolean | undefined {
  return role === "all-program" || role === "general-education" ? true : undefined;
}

function isAllProgramLikeRole(role: CourseAssignmentListRole): boolean {
  return role === "all-program" || role === "general-education";
}

function effectiveCourseScopeForRole(
  role: CourseAssignmentListRole,
  courseScope: CourseScope | undefined
): CourseScope | undefined {
  return role === "general-education" ? CourseScope.GENERAL_EDUCATION : courseScope;
}

// fallow-ignore-next-line complexity
export function parseCourseAssignmentListState(
  rawSearchParams: CourseAssignmentSearchParams,
  role: CourseAssignmentListRole,
  defaultTermInstanceId?: string | null
): CourseAssignmentListUrlState {
  const page = parseOptional(rawSearchParams.page, pageSchema) ?? 1;
  const termInstanceCandidate = firstNonEmptyValue(rawSearchParams.termInstanceId);
  const termInstanceId = parseOptional(rawSearchParams.termInstanceId, uuidSchema);
  const courseId = parseOptional(rawSearchParams.courseId, uuidSchema);
  const facultyId = parseOptional(rawSearchParams.facultyId, uuidSchema);
  const programId = parseOptional(rawSearchParams.programId, uuidSchema);
  const yearLevel = parseOptional(rawSearchParams.yearLevel, yearLevelSchema);
  const section = parseOptional(rawSearchParams.section, sectionSchema);
  const courseScope = parseOptional(rawSearchParams.courseScope, courseScopeSchema);
  const isActive = parseBoolean(rawSearchParams.isActive);
  const isActiveCandidate = firstNonEmptyValue(rawSearchParams.isActive);
  const q = parseQuery(rawSearchParams.q);
  const roster = firstNonEmptyValue(rawSearchParams.roster);
  const effectiveCourseScope = effectiveCourseScopeForRole(role, courseScope);

  const filters: ListCourseAssignmentsFilter = {
    ...(termInstanceId !== undefined
      ? { termInstanceId }
      : termInstanceCandidate !== "all" && defaultTermInstanceId
        ? { termInstanceId: defaultTermInstanceId }
        : {}),
    ...(courseId !== undefined && { courseId }),
    ...(facultyId !== undefined && { facultyId }),
    ...(isAllProgramLikeRole(role) && programId !== undefined && { programId }),
    ...(yearLevel !== undefined && { yearLevel }),
    ...(section !== undefined && { section }),
    ...(effectiveCourseScope !== undefined && { courseScope: effectiveCourseScope }),
    ...(isActive !== undefined && { isActive }),
    ...(q !== undefined && { q }),
    ...(isAllProgramLikeRole(role) && roster === "empty" && { hasActiveRosterMembers: false }),
  };

  const termInstanceMode =
    termInstanceCandidate === "all" || (defaultTermInstanceId === null && !termInstanceId)
      ? ("all" as const)
      : undefined;

  if (isAllProgramLikeRole(role) && isActiveCandidate === "all") {
    return { page, filters, isActiveMode: "all", ...(termInstanceMode && { termInstanceMode }) };
  }

  const defaultIsActive = roleDefaultIsActive(role);
  if (filters.isActive === undefined && defaultIsActive !== undefined) {
    filters.isActive = defaultIsActive;
  }

  return { page, filters, ...(termInstanceMode && { termInstanceMode }) };
}

// fallow-ignore-next-line complexity
export function serializeCourseAssignmentListState(
  state: CourseAssignmentListUrlState,
  role: CourseAssignmentListRole
): URLSearchParams {
  const params = new URLSearchParams();
  const { filters } = state;
  const defaultIsActive = roleDefaultIsActive(role);

  if (state.page > 1) params.set("page", String(state.page));
  if (state.termInstanceMode === "all") params.set("termInstanceId", "all");
  else if (filters.termInstanceId) params.set("termInstanceId", filters.termInstanceId);
  if (filters.courseId) params.set("courseId", filters.courseId);
  if (filters.facultyId) params.set("facultyId", filters.facultyId);
  if (isAllProgramLikeRole(role) && filters.programId) params.set("programId", filters.programId);
  if (filters.yearLevel) params.set("yearLevel", filters.yearLevel);
  if (filters.section) params.set("section", filters.section);
  if (role !== "general-education" && filters.courseScope)
    params.set("courseScope", filters.courseScope);
  if (isAllProgramLikeRole(role) && state.isActiveMode === "all") {
    params.set("isActive", "all");
  } else if (filters.isActive !== undefined && filters.isActive !== defaultIsActive) {
    params.set("isActive", String(filters.isActive));
  }
  if (filters.q) params.set("q", filters.q);
  if (isAllProgramLikeRole(role) && filters.hasActiveRosterMembers === false) {
    params.set("roster", "empty");
  }

  return params;
}

export function isCanonicalCourseAssignmentListState(
  rawSearchParams: CourseAssignmentSearchParams,
  state: CourseAssignmentListUrlState,
  role: CourseAssignmentListRole
): boolean {
  const raw = new URLSearchParams();
  for (const key of Object.keys(rawSearchParams)) {
    const value = rawSearchParams[key];
    if (Array.isArray(value)) {
      for (const item of value) raw.append(key, item);
    } else if (value !== undefined) {
      raw.set(key, value);
    }
  }

  return raw.toString() === serializeCourseAssignmentListState(state, role).toString();
}

export function getCourseAssignmentListQueryKeys(): readonly string[] {
  return queryKeys;
}

export function toCourseAssignmentListOptions(state: CourseAssignmentListUrlState) {
  return { page: state.page - 1 };
}

export function courseAssignmentListPath(
  pathname: string,
  state: CourseAssignmentListUrlState,
  role: CourseAssignmentListRole
): string {
  const query = serializeCourseAssignmentListState(state, role).toString();
  return query ? `${pathname}?${query}` : pathname;
}
