import { AcademicSemester } from "@prisma/client";
import { z } from "zod";
import { buildProgramHeadProgramPath } from "@/lib/constants/program-head-routes";

/** Canonical Program Head analytics tabs. `overview` is the default landing tab. */
export const ANALYTICS_TABS = [
  "overview",
  "outcomes",
  "stakeholders",
  "breakdowns",
  "trends",
  "feedback",
  "ai",
] as const;

/**
 * Tabs with a shipped view. Upcoming tabs render the shell's explanatory
 * notice instead of their (not-yet-shipped) view content.
 */
export const LIVE_ANALYTICS_TABS: readonly AnalyticsTab[] = [
  "overview",
  "outcomes",
  "stakeholders",
  "breakdowns",
  "trends",
  "feedback",
  "ai",
];

export type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

/** Filter state parsed from the analytics URL query string. */
export type AnalyticsFilterState = {
  tab: AnalyticsTab;
  schoolYearId?: string;
  semester?: string;
  termInstanceId?: string;
};

/** Human-readable labels for each analytics tab. */
export const ANALYTICS_TAB_LABELS: Record<AnalyticsTab, string> = {
  overview: "Overview",
  outcomes: "Outcomes",
  stakeholders: "Stakeholders",
  breakdowns: "Breakdowns",
  trends: "Trends",
  feedback: "Feedback",
  ai: "AI Insights",
};

type RawAnalyticsSearchParams = Record<string, string | string[] | undefined>;

function firstNonEmpty(value: string | string[] | undefined): string | undefined {
  const values = Array.isArray(value) ? value : [value];
  return values.find((entry): entry is string => !!entry && entry.trim().length > 0)?.trim();
}

// Every field is lenient: invalid or missing values are dropped (or defaulted
// for `tab`) rather than surfaced as errors, so the page never 404s on a
// stale or hand-edited query string.
const analyticsSearchParamsSchema = z.object({
  tab: z.enum(ANALYTICS_TABS).catch("overview"),
  schoolYearId: z.string().uuid().optional().catch(undefined),
  semester: z.nativeEnum(AcademicSemester).optional().catch(undefined),
  termInstanceId: z.string().uuid().optional().catch(undefined),
});

/**
 * Parse the analytics route's search params into a canonical filter state.
 * Missing/invalid `tab` defaults to `overview`; invalid optional values are
 * dropped.
 */
export function parseAnalyticsSearchParams(
  raw: RawAnalyticsSearchParams = {}
): AnalyticsFilterState {
  return analyticsSearchParamsSchema.parse({
    tab: firstNonEmpty(raw.tab),
    schoolYearId: firstNonEmpty(raw.schoolYearId),
    semester: firstNonEmpty(raw.semester),
    termInstanceId: firstNonEmpty(raw.termInstanceId),
  });
}

/** Known analytics filter keys for raw query comparison. */
const ANALYTICS_PARAM_KEYS = ["tab", "schoolYearId", "semester", "termInstanceId"] as const;

/**
 * Build a query string from the raw analytics-related params without trimming
 * or collapsing values. This lets the route redirect duplicate, padded, or
 * otherwise non-canonical query input instead of accepting it as a stable URL.
 */
export function rawAnalyticsSearchParamsToQueryString(
  raw: RawAnalyticsSearchParams
): string {
  const searchParams = new URLSearchParams();
  for (const key of ANALYTICS_PARAM_KEYS) {
    const value = raw[key];
    if (Array.isArray(value)) {
      for (const entry of value) searchParams.append(key, entry);
    } else if (value !== undefined) {
      searchParams.append(key, value);
    }
  }
  return searchParams.toString();
}
/**
 * Build the canonical query string for the given filter state.
 * Used to compare against the raw URL for canonicalization redirects.
 */
export function buildAnalyticsQueryString(filters: AnalyticsFilterState): string {
  const searchParams = new URLSearchParams();
  if (filters.tab && filters.tab !== "overview") searchParams.set("tab", filters.tab);
  if (filters.schoolYearId) searchParams.set("schoolYearId", filters.schoolYearId);
  if (filters.semester) searchParams.set("semester", filters.semester);
  if (filters.termInstanceId) searchParams.set("termInstanceId", filters.termInstanceId);
  return searchParams.toString();
}

/**
 * Build the analytics URL for a program, appending only non-default,
 * non-empty query params (`tab=overview` is the default and is omitted).
 */
export function buildAnalyticsUrl(
  programId: string,
  params: Partial<AnalyticsFilterState> = {}
): string {
  const path = buildProgramHeadProgramPath(programId, "analytics");
  const searchParams = new URLSearchParams();
  if (params.tab && params.tab !== "overview") searchParams.set("tab", params.tab);
  if (params.schoolYearId) searchParams.set("schoolYearId", params.schoolYearId);
  if (params.semester) searchParams.set("semester", params.semester);
  if (params.termInstanceId) searchParams.set("termInstanceId", params.termInstanceId);
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Build the analytics URL for a specific tab, preserving the valid filter
 * params already present in `currentFilters`.
 */
export function buildAnalyticsTabUrl(
  programId: string,
  tab: AnalyticsTab,
  currentFilters: AnalyticsFilterState
): string {
  return buildAnalyticsUrl(programId, { ...currentFilters, tab });
}

/**
 * Deterministic fingerprint of the analytics scope filters. The AI Server
 * Action attaches it to every generated interpretation so the client can mark
 * results stale when the URL filter state changes after generation.
 */
export function buildAnalyticsFilterFingerprint(
  filters: Pick<AnalyticsFilterState, "schoolYearId" | "semester" | "termInstanceId">
): string {
  return [
    filters.schoolYearId ?? "",
    filters.semester ?? "",
    filters.termInstanceId ?? "",
  ].join("|");
}
