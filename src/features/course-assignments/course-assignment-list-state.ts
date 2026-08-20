import { CourseScope, StudentSection, YearLevel } from "@prisma/client";
import { z } from "zod";
import type { ListCourseAssignmentsFilter } from "./types";

export type CourseAssignmentListRole = "all-program" | "program-head" | "general-education";

export type CourseAssignmentListUrlState = {
  page: number;
  filters: ListCourseAssignmentsFilter;
  isActiveMode?: "all";
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

export function parseCourseAssignmentListState(
  rawSearchParams: CourseAssignmentSearchParams,
  role: CourseAssignmentListRole
): CourseAssignmentListUrlState {
  const page = parseOptional(rawSearchParams.page, pageSchema) ?? 1;
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
  // general-education mode fixes Course scope server-side; URL cannot widen it
  const effectiveCourseScope =
    role === "general-education" ? CourseScope.GENERAL_EDUCATION : courseScope;

  const filters: ListCourseAssignmentsFilter = {
    ...(termInstanceId !== undefined && { termInstanceId }),
    ...(courseId !== undefined && { courseId }),
    ...(facultyId !== undefined && { facultyId }),
    ...(role === "all-program" && programId !== undefined && { programId }),
    ...(role === "general-education" && programId !== undefined && { programId }),
    ...(yearLevel !== undefined && { yearLevel }),
    ...(section !== undefined && { section }),
    ...(effectiveCourseScope !== undefined && { courseScope: effectiveCourseScope }),
    ...(isActive !== undefined && { isActive }),
    ...(q !== undefined && { q }),
  };

  if ((role === "all-program" || role === "general-education") && isActiveCandidate === "all") {
    return { page, filters, isActiveMode: "all" };
  }

  if (filters.isActive === undefined) {
    filters.isActive = roleDefaultIsActive(role);
  }

  return { page, filters };
}

export function serializeCourseAssignmentListState(
  state: CourseAssignmentListUrlState,
  role: CourseAssignmentListRole
): URLSearchParams {
  const params = new URLSearchParams();
  const { filters } = state;
  const defaultIsActive = roleDefaultIsActive(role);

  if (state.page > 1) params.set("page", String(state.page));
  if (filters.termInstanceId) params.set("termInstanceId", filters.termInstanceId);
  if (filters.courseId) params.set("courseId", filters.courseId);
  if (filters.facultyId) params.set("facultyId", filters.facultyId);
  if (role === "all-program" && filters.programId) params.set("programId", filters.programId);
  if (role === "general-education" && filters.programId) params.set("programId", filters.programId);
  if (filters.yearLevel) params.set("yearLevel", filters.yearLevel);
  if (filters.section) params.set("section", filters.section);
  if (role !== "general-education" && filters.courseScope) params.set("courseScope", filters.courseScope);
  if ((role === "all-program" || role === "general-education") && state.isActiveMode === "all") {
    params.set("isActive", "all");
  } else if (filters.isActive !== undefined && filters.isActive !== defaultIsActive) {
    params.set("isActive", String(filters.isActive));
  }
  if (filters.q) params.set("q", filters.q);

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
