import type { EvaluationToolsTab } from "./evaluation-tools-tabs";
import type { ToolsViewMode } from "./tools-view-selector";
import type { PublishedStatusFilter } from "@/features/evaluations/types";
type ToolsRouteSearchParams = Record<string, string | string[] | undefined>;

/**
 * Derive the persisted tab/view defaults from the URL. Canonical URLs omit
 * default values (see updateToolsUrl), so anything unrecognized falls back to
 * the defaults. Shared by the faculty and program-head tools routes.
 */
export function parseToolsViewState(searchParams: ToolsRouteSearchParams): {
  initialTab: EvaluationToolsTab;
  initialView: ToolsViewMode;
} {
  return {
    initialTab: searchParams.tab === "published" ? "published" : "templates",
    initialView: searchParams.view === "list" ? "list" : "card",
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PUBLISHED_QUERY_LENGTH = 100;
const PUBLISHED_STATUSES = ["active", "scheduled", "closed", "archived"] as const;

export function normalizePublishedQuery(query: string): string {
  return query.trim().slice(0, MAX_PUBLISHED_QUERY_LENGTH);
}

export type PublishedEvaluationFilters = {
  periodId: string | null;
  courseId: string | null;
  /** Central-deployment audience facet (program-head Published tab); null means all. */
  target: string | null;
  query: string;
  status: PublishedStatusFilter;
};

export const DEFAULT_PUBLISHED_FILTERS: PublishedEvaluationFilters = {
  periodId: null,
  courseId: null,
  target: null,
  query: "",
  status: "ALL",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value.find((entry) => entry.trim().length > 0);
  return value;
}

function parseUuidParam(value: string | string[] | undefined): string | null {
  const candidate = firstParam(value)?.trim() ?? "";
  return UUID_PATTERN.test(candidate) ? candidate : null;
}

function parseQueryParam(value: string | string[] | undefined): string {
  return normalizePublishedQuery(firstParam(value) ?? "");
}

function parseStatusParam(value: string | string[] | undefined): PublishedStatusFilter {
  const candidate = firstParam(value)?.trim().toLowerCase() ?? "";
  const match = PUBLISHED_STATUSES.find((status) => status === candidate);
  return match ? (match.toUpperCase() as PublishedStatusFilter) : "ALL";
}

const PUBLISHED_TARGETS = ["student", "alumni", "industry_partner"] as const;

function parseTargetParam(value: string | string[] | undefined): string | null {
  const candidate = firstParam(value)?.trim().toLowerCase() ?? "";
  const match = PUBLISHED_TARGETS.find((target) => target === candidate);
  return match ? match.toUpperCase() : null;
}

/**
 * Derive the Published-tab filter defaults from the URL. Canonical URLs omit
 * defaults, so anything missing or unrecognized falls back to "All". Shared by
 * the faculty and program-head tools routes; each route only reads the facet
 * keys its deployments carry (course vs target).
 */
export function parsePublishedEvaluationFilters(
  searchParams: ToolsRouteSearchParams
): PublishedEvaluationFilters {
  return {
    periodId: parseUuidParam(searchParams.period),
    courseId: parseUuidParam(searchParams.course),
    target: parseTargetParam(searchParams.target),
    query: parseQueryParam(searchParams.q),
    status: parseStatusParam(searchParams.status),
  };
}

function setFilterParam(url: URL, key: string, value: string | null) {
  if (value === null || value === "") url.searchParams.delete(key);
  else url.searchParams.set(key, value);
}

/**
 * Persist Published-tab filters to the URL without navigating, so filtering
 * stays client-side (no server round-trip) while remaining shareable.
 * Discrete selects push history; typing passes `"replace"` to avoid spam.
 */
export function updatePublishedFiltersUrl(
  filters: PublishedEvaluationFilters,
  navigation: "push" | "replace" = "push"
) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  setFilterParam(url, "period", filters.periodId);
  setFilterParam(url, "course", filters.courseId);
  setFilterParam(url, "target", filters.target === null ? null : filters.target.toLowerCase());
  setFilterParam(url, "q", normalizePublishedQuery(filters.query));
  setFilterParam(url, "status", filters.status === "ALL" ? null : filters.status.toLowerCase());
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (navigation === "replace") window.history.replaceState(null, "", next);
  else window.history.pushState(null, "", next);
}
