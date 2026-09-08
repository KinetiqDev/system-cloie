import type { DeploymentStatus } from "@prisma/client";

import { normalizePublishedQuery } from "@/features/instruments/components/tools-view-state";
import type { PublishedEvaluationFilters } from "@/features/instruments/components/tools-view-state";
import type { FacultyPublishedEvaluationItem } from "../types";
export type FilterablePublishedEvaluation = Pick<
  FacultyPublishedEvaluationItem,
  | "evaluationId"
  | "deploymentName"
  | "courseId"
  | "courseCode"
  | "courseTitle"
  | "termInstanceId"
  | "termInstanceLabel"
  | "status"
>;

export type PeriodFilterOption = { id: string; label: string };

export type CourseFilterOption = { id: string; code: string; title: string; label: string };

/**
 * Period options scoped to the faculty member's own evaluations, newest
 * first. Labels share the Academic Period format, so lexicographic order
 * matches reverse-chronological order.
 */
export function distinctPeriodOptions(
  items: FilterablePublishedEvaluation[]
): PeriodFilterOption[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    if (!seen.has(item.termInstanceId)) seen.set(item.termInstanceId, item.termInstanceLabel);
  }
  return [...seen]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => b.label.localeCompare(a.label));
}

export function distinctCourseOptions(
  items: FilterablePublishedEvaluation[]
): CourseFilterOption[] {
  const seen = new Map<string, CourseFilterOption>();
  for (const item of items) {
    if (!seen.has(item.courseId)) {
      seen.set(item.courseId, {
        id: item.courseId,
        code: item.courseCode,
        title: item.courseTitle,
        label: `${item.courseCode} · ${item.courseTitle}`,
      });
    }
  }
  return [...seen.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function matchesStatus(
  item: FilterablePublishedEvaluation,
  status: PublishedEvaluationFilters["status"]
): boolean {
  if (status === "ALL") return item.status !== ("ARCHIVED" as DeploymentStatus);
  return item.status === status;
}

function matchesQuery(item: FilterablePublishedEvaluation, query: string): boolean {
  const needle = normalizePublishedQuery(query).toLowerCase();
  if (!needle) return true;
  return [item.deploymentName, item.courseCode, item.courseTitle, item.termInstanceLabel]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function filterPublishedEvaluations<T extends FilterablePublishedEvaluation>(
  items: T[],
  filters: PublishedEvaluationFilters
): T[] {
  return items.filter(
    (item) =>
      matchesStatus(item, filters.status) &&
      (filters.periodId === null || item.termInstanceId === filters.periodId) &&
      (filters.courseId === null || item.courseId === filters.courseId) &&
      matchesQuery(item, filters.query)
  );
}

export function hasActivePublishedFilters(filters: PublishedEvaluationFilters): boolean {
  return (
    filters.status !== "ALL" ||
    filters.periodId !== null ||
    filters.courseId !== null ||
    filters.query.trim().length > 0
  );
}
