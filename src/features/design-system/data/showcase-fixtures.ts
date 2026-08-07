/**
 * Static, typed, serializable fixture data for the protected Design System
 * Showcase (ADR 0010, Design Decision 5).
 *
 * These fixtures are representative reference data only: they contain no
 * institutional records, no user data, no credentials, and no session data.
 * They are rendered only under the server-side `resolveShowcaseAccess`
 * policy and are never queried, mutated, cached, or persisted at runtime.
 */

export type ShowcaseStatus = "success" | "warning" | "danger" | "information";

interface ShowcaseProgram {
  id: string;
  code: string;
  name: string;
  courseCount: number;
  status: ShowcaseStatus;
  statusLabel: string;
}

interface ShowcaseKpi {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: "positive" | "neutral" | "negative";
}

interface ShowcaseFormOption {
  value: string;
  label: string;
}

interface ShowcaseProgressItem {
  id: string;
  label: string;
  value: number;
  detail: string;
}

interface ShowcaseAlertExample {
  id: string;
  kind: ShowcaseStatus;
  title: string;
  description: string;
}

interface ShowcaseEmptyExample {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
}

interface ShowcaseTabContent {
  id: string;
  heading: string;
  body: string;
}

export const SHOWCASE_PROGRAMS: readonly ShowcaseProgram[] = [
  {
    id: "sample-program-01",
    code: "SAMPLE-A",
    name: "Sample Program A",
    courseCount: 12,
    status: "success",
    statusLabel: "Active",
  },
  {
    id: "sample-program-02",
    code: "SAMPLE-B",
    name: "Sample Program B",
    courseCount: 8,
    status: "information",
    statusLabel: "Under review",
  },
  {
    id: "sample-program-03",
    code: "SAMPLE-C",
    name: "Sample Program C",
    courseCount: 15,
    status: "warning",
    statusLabel: "Attention needed",
  },
  {
    id: "sample-program-04",
    code: "SAMPLE-D",
    name: "Sample Program D",
    courseCount: 4,
    status: "danger",
    statusLabel: "On hold",
  },
];

export const SHOWCASE_KPIS: readonly ShowcaseKpi[] = [
  { id: "kpi-1", label: "Sample metric one", value: "128", change: "+12%", trend: "positive" },
  { id: "kpi-2", label: "Sample metric two", value: "64", change: "0%", trend: "neutral" },
  { id: "kpi-3", label: "Sample metric three", value: "32", change: "-8%", trend: "negative" },
  { id: "kpi-4", label: "Sample metric four", value: "16", change: "+4%", trend: "positive" },
];

export const SHOWCASE_DEPARTMENT_OPTIONS: readonly ShowcaseFormOption[] = [
  { value: "arts", label: "Arts and Sciences" },
  { value: "business", label: "Business and Management" },
  { value: "education", label: "Education" },
  { value: "engineering", label: "Engineering" },
];

export const SHOWCASE_ROLE_OPTIONS: readonly ShowcaseFormOption[] = [
  { value: "coordinator", label: "Program Coordinator" },
  { value: "evaluator", label: "Evaluator" },
  { value: "observer", label: "Observer" },
];

export const SHOWCASE_PLAN_OPTIONS: readonly ShowcaseFormOption[] = [
  { value: "standard", label: "Standard plan" },
  { value: "extended", label: "Extended plan" },
  { value: "full", label: "Full plan" },
];

export const SHOWCASE_PROGRESS_ITEMS: readonly ShowcaseProgressItem[] = [
  { id: "progress-1", label: "Term one", value: 100, detail: "10 of 10" },
  { id: "progress-2", label: "Term two", value: 70, detail: "7 of 10" },
  { id: "progress-3", label: "Term three", value: 40, detail: "4 of 10" },
  { id: "progress-4", label: "Term four", value: 10, detail: "1 of 10" },
];

export const SHOWCASE_ALERTS: readonly ShowcaseAlertExample[] = [
  {
    id: "alert-success",
    kind: "success",
    title: "Saved",
    description: "Your reference changes were recorded locally.",
  },
  {
    id: "alert-warning",
    kind: "warning",
    title: "Review required",
    description: "One or more fields need your attention before continuing.",
  },
  {
    id: "alert-danger",
    kind: "danger",
    title: "Action failed",
    description: "The reference operation could not be completed. Try again.",
  },
  {
    id: "alert-information",
    kind: "information",
    title: "Good to know",
    description: "This showcase renders static fixtures and performs no mutations.",
  },
];

export const SHOWCASE_EMPTY_EXAMPLES: readonly ShowcaseEmptyExample[] = [
  {
    id: "empty-no-data",
    title: "No records yet",
    description: "Records you create will appear here. This is reference copy only.",
    actionLabel: "Create record",
  },
  {
    id: "empty-no-results",
    title: "No results found",
    description: "Try adjusting your filters or search terms.",
    actionLabel: "Clear filters",
  },
];

export const SHOWCASE_TAB_CONTENT: readonly ShowcaseTabContent[] = [
  {
    id: "tab-overview",
    heading: "Overview",
    body: "Reference overview copy for the first tab pane.",
  },
  {
    id: "tab-details",
    heading: "Details",
    body: "Reference details copy for the second tab pane.",
  },
  {
    id: "tab-history",
    heading: "History",
    body: "Reference history copy for the third tab pane.",
  },
];

export const SHOWCASE_OFFLINE_REFERENCE = {
  title: "Static offline reference",
  description:
    "This card is a static visual reference of the approved offline pattern. Offline data, service-worker caching, and offline mutation are not available in this application.",
  note: "No navigator.onLine check, service worker, or cached application data is used by the showcase.",
} as const;

export const SHOWCASE_ERROR_REFERENCE = {
  title: "Something went wrong",
  description:
    "A reference error state with its cause, impact, and a recovery path. No real error occurred.",
  cause: "Example cause",
  impact: "Example impact: the reference operation did not run.",
  recovery: "Try again, then contact support if the issue persists.",
  retryLabel: "Try again",
} as const;
