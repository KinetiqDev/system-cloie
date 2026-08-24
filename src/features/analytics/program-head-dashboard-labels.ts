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
 * Dashboard evidence-source key → analytics filter params (§15 coupling).
 * Course evaluations are answered by students, so their analytics scope never
 * carries an explicit stakeholder value.
 */
export const DASHBOARD_SOURCE_TO_ANALYTICS_FILTER: Record<
  DashboardSourceKey,
  { evidenceSource: "COURSE" | "PROGRAM_WIDE_STUDENT" | "ALUMNI" | "INDUSTRY"; stakeholder?: "STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER" }
> = {
  COURSE_STUDENT: { evidenceSource: "COURSE" },
  CENTRAL_STUDENT: { evidenceSource: "PROGRAM_WIDE_STUDENT", stakeholder: "STUDENT" },
  ALUMNI: { evidenceSource: "ALUMNI", stakeholder: "ALUMNI" },
  INDUSTRY_PARTNER: { evidenceSource: "INDUSTRY", stakeholder: "INDUSTRY_PARTNER" },
};

/**
 * Server-side ceiling for the qualitative pulse word cloud (§13.10). Tokens
 * are identifier-redacted and truncated server-side; the client slider only
 * re-slices this bounded list.
 */
export const QUALITATIVE_TOKEN_CAP = 60;
