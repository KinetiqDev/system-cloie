// ---------------------------------------------------------------------------
// Client-safe dashboard vocabulary (spec §13)
//
// Kept free of server imports so client components can share the canonical
// source ordering and labels with the read service without pulling Prisma
// into the browser bundle.
// ---------------------------------------------------------------------------

/** Canonical evidence-source display order shared by every dashboard card. */
export const DASHBOARD_SOURCE_ORDER = [
  "COURSE_STUDENT",
  "CENTRAL_STUDENT",
  "ALUMNI",
  "INDUSTRY_PARTNER",
] as const;

export type DashboardSourceKey = (typeof DASHBOARD_SOURCE_ORDER)[number];

/** §13.5 quantitative-results card labels; sources stay separate (§8). */
export const SOURCE_CARD_LABELS: Record<DashboardSourceKey, string> = {
  COURSE_STUDENT: "Course evaluations",
  CENTRAL_STUDENT: "Program-wide students",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry Partners",
};

/** §13.8 PLO-summary evidence-source selector labels. */
export const PLO_SOURCE_LABELS: Record<DashboardSourceKey, string> = {
  COURSE_STUDENT: "Course CILO",
  CENTRAL_STUDENT: "Program-wide students",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry",
};

/** §13.6/§13.2 stakeholder display labels (person-level participation rows). */
export const STAKEHOLDER_LABELS: Record<string, string> = {
  STUDENT: "Students",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry Partners",
};

/**
 * Server-side ceiling for the qualitative pulse word cloud (§13.10). Tokens
 * are identifier-redacted and truncated server-side; the client slider only
 * re-slices this bounded list.
 */
export const QUALITATIVE_TOKEN_CAP = 60;
