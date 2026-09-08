import type { DeploymentStatus } from "@prisma/client";

import { normalizePublishedQuery } from "@/features/instruments/components/tools-view-state";
import type { PublishedEvaluationFilters } from "@/features/instruments/components/tools-view-state";
import type { FacultyPublishedEvaluationItem } from "../types";
export type FilterablePublishedEvaluation = {
  evaluationId: string;
  deploymentName: string;
  termInstanceId: string | null;
  termInstanceLabel: string | null;
  status: DeploymentStatus;
} & Partial<Pick<FacultyPublishedEvaluationItem, "courseId" | "courseCode" | "courseTitle">> & {
    /** Central-deployment audience (program-head rows); absent on faculty rows. */
    targetStakeholder?: string | null;
  };

export function formatTargetStakeholder(stakeholder: string): string {
  return stakeholder
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export type PeriodFilterOption = { id: string; label: string };

export type CourseFilterOption = { id: string; code: string; title: string; label: string };

export type TargetFilterOption = { id: string; label: string };

/**
 * Period options scoped to the visible evaluations, newest first. Labels share
 * the Academic Period format, so lexicographic order matches
 * reverse-chronological order. Rows without a period are skipped.
 */
export function distinctPeriodOptions(
  items: FilterablePublishedEvaluation[]
): PeriodFilterOption[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    if (item.termInstanceId !== null && !seen.has(item.termInstanceId)) {
      seen.set(item.termInstanceId, item.termInstanceLabel ?? "");
    }
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
    if (item.courseId !== undefined && item.courseId !== null && !seen.has(item.courseId)) {
      seen.set(item.courseId, {
        id: item.courseId,
        code: item.courseCode ?? "",
        title: item.courseTitle ?? "",
        label: `${item.courseCode ?? ""} · ${item.courseTitle ?? ""}`,
      });
    }
  }
  return [...seen.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export function distinctTargetOptions(
  items: FilterablePublishedEvaluation[]
): TargetFilterOption[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    if (
      item.targetStakeholder !== undefined &&
      item.targetStakeholder !== null &&
      !seen.has(item.targetStakeholder)
    ) {
      seen.set(item.targetStakeholder, formatTargetStakeholder(item.targetStakeholder));
    }
  }
  return [...seen]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
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
  const haystack = [
    item.deploymentName,
    item.courseCode ?? "",
    item.courseTitle ?? "",
    item.targetStakeholder ? formatTargetStakeholder(item.targetStakeholder) : "",
    item.termInstanceLabel ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
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
      (filters.target === null || item.targetStakeholder === filters.target) &&
      matchesQuery(item, filters.query)
  );
}

export function hasActivePublishedFilters(filters: PublishedEvaluationFilters): boolean {
  return (
    filters.status !== "ALL" ||
    filters.periodId !== null ||
    filters.courseId !== null ||
    filters.target !== null ||
    filters.query.trim().length > 0
  );
}
