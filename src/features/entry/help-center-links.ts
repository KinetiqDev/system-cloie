import type { Role } from "@/lib/constants/roles";

/**
 * System CLOIE Help Center — contextual help.
 *
 * The Help Center is a separate static site (`KinetiqDev/system-cloie-help`,
 * deployed at `https://help.system-cloie.app`). This module is the single
 * resolver that turns a current application route into a stable Help Center
 * article. Routes must never carry their mapping inline: one table, one
 * resolver, one fallback chain.
 *
 * Rules:
 * - Help Center URLs are stable and role-shaped. Dynamic application ids
 *   (program ids, evaluation ids, response ids, assignment ids) never appear.
 * - No exact mapping falls back to the active role's landing page.
 * - No resolvable role falls back to the role chooser.
 *
 * This is a pure function over a pathname. It performs no authorization and
 * never widens access: it only chooses a documentation URL.
 */

export const HELP_CENTER_ORIGIN = "https://help.system-cloie.app";

/**
 * Application route prefix -> Help Center section. Used for the role fallback,
 * so a new page inside a role automatically inherits that role's landing page.
 */
const ROLE_LANDING: Record<Role, string> = {
  SECRETARY: "secretary",
  DEAN: "dean",
  GEN_ED_COORDINATOR: "gen-ed-coordinator",
  PROGRAM_HEAD: "program-head",
  FACULTY: "faculty",
  STUDENT: "student",
  ALUMNI: "alumni",
  INDUSTRY_PARTNER: "industry-partner",
};

/** Shown when neither an exact mapping nor a role is available. */
export const ROLE_CHOOSER_PATH = "/start/choose-your-role/";

export type HelpRoute = {
  /** Static application path, with `:param` placeholders for dynamic segments. */
  appRoute: string;
  /** Help Center path, without a trailing slash on the segment root. */
  helpPath: string;
};

/**
 * Longest-first ordering is resolved at lookup time by segment count, so the
 * order here is for readability only. `appRoutes` frontmatter in the Help
 * Center declares the same mapping for maintainers on the docs side.
 *
 * Exported so the mapping table can be asserted as a table (no shadowed entry,
 * no id leakage) rather than only through the resolver.
 */
export const HELP_ROUTES: readonly HelpRoute[] = [
  // ---------------------------------------------------------------- Secretary
  { appRoute: "/secretary/users/new", helpPath: "/secretary/create-user/" },
  { appRoute: "/secretary/faculty-requests", helpPath: "/secretary/faculty-requests/" },
  { appRoute: "/secretary/users", helpPath: "/secretary/users/" },
  { appRoute: "/secretary/school-years/:id/rollover", helpPath: "/secretary/term-rollover/" },
  { appRoute: "/secretary/school-years/:id", helpPath: "/secretary/academic-calendar/" },
  { appRoute: "/secretary/school-years", helpPath: "/secretary/academic-calendar/" },
  { appRoute: "/secretary/programs", helpPath: "/secretary/programs/" },
  { appRoute: "/secretary/courses/:id/edit", helpPath: "/secretary/courses/" },
  { appRoute: "/secretary/courses/new", helpPath: "/secretary/courses/" },
  { appRoute: "/secretary/courses", helpPath: "/secretary/courses/" },
  { appRoute: "/secretary/course-assignments", helpPath: "/secretary/course-assignments/" },
  { appRoute: "/secretary/instruments/new", helpPath: "/secretary/evaluation-tools/" },
  { appRoute: "/secretary/instruments/:id/edit", helpPath: "/secretary/evaluation-tools/" },
  { appRoute: "/secretary/instruments", helpPath: "/secretary/evaluation-tools/" },
  { appRoute: "/secretary/dashboard", helpPath: "/secretary/" },
  // Learning Outcomes redirects to the dashboard server-side, so it is never
  // a client pathname here. Kept out of the table on purpose.

  // -------------------------------------------------------------------- Dean
  {
    appRoute: "/dean/academic-structure/course-assignments",
    helpPath: "/dean/course-assignments/",
  },
  { appRoute: "/dean/academic-structure/programs/new", helpPath: "/dean/academic-structure/" },
  { appRoute: "/dean/academic-structure/programs", helpPath: "/dean/academic-structure/" },
  { appRoute: "/dean/academic-structure/courses", helpPath: "/dean/academic-structure/" },
  { appRoute: "/dean/academic-structure/instruments/new", helpPath: "/dean/evaluation-tools/" },
  { appRoute: "/dean/academic-structure/instruments", helpPath: "/dean/evaluation-tools/" },
  { appRoute: "/dean/academic-structure", helpPath: "/dean/academic-structure/" },
  {
    appRoute: "/dean/college-oversight/learning-outcomes",
    helpPath: "/dean/learning-outcomes/",
  },
  { appRoute: "/dean/college-oversight", helpPath: "/dean/learning-outcomes/" },
  { appRoute: "/dean/dashboard", helpPath: "/dean/dashboard/" },
  { appRoute: "/dean/profile", helpPath: "/start/complete-your-profile/" },
  // `/dean/analytics` and `/dean/reports` resolve to notFound() server-side and
  // are absent from the Dean navigation, so they are deliberately unmapped.

  // ------------------------------------------- General Education Coordinator
  {
    appRoute: "/gen-ed-coordinator/outcomes/mapping",
    helpPath: "/gen-ed-coordinator/outcome-alignment/",
  },
  { appRoute: "/gen-ed-coordinator/outcomes", helpPath: "/gen-ed-coordinator/outcomes/" },
  { appRoute: "/gen-ed-coordinator/courses", helpPath: "/gen-ed-coordinator/courses/" },
  {
    appRoute: "/gen-ed-coordinator/course-assignments",
    helpPath: "/gen-ed-coordinator/course-assignments/",
  },
  { appRoute: "/gen-ed-coordinator/analytics", helpPath: "/gen-ed-coordinator/analytics/" },
  { appRoute: "/gen-ed-coordinator/dashboard", helpPath: "/gen-ed-coordinator/" },
  { appRoute: "/gen-ed-coordinator/profile", helpPath: "/start/complete-your-profile/" },

  // ------------------------------------------------------------- Program Head
  {
    appRoute: "/program-head/programs/:programId/outcomes/mapping",
    helpPath: "/program-head/outcome-alignment/",
  },
  { appRoute: "/program-head/programs/:programId/outcomes", helpPath: "/program-head/outcomes/" },
  {
    appRoute: "/program-head/programs/:programId/course-assignments",
    helpPath: "/program-head/course-assignments/",
  },
  {
    appRoute: "/program-head/programs/:programId/course-rosters/:assignmentId",
    helpPath: "/program-head/course-assignments/",
  },
  { appRoute: "/program-head/programs/:programId/courses", helpPath: "/program-head/courses/" },
  { appRoute: "/program-head/programs/:programId/dashboard", helpPath: "/program-head/dashboard/" },
  { appRoute: "/program-head/programs/:programId/analytics", helpPath: "/program-head/analytics/" },
  { appRoute: "/program-head/programs/:programId/reports", helpPath: "/program-head/reports/" },
  {
    appRoute:
      "/program-head/programs/:programId/responses/course/:evaluationId/responses/:responseId",
    helpPath: "/program-head/responses/",
  },
  {
    appRoute: "/program-head/programs/:programId/responses/course/:evaluationId",
    helpPath: "/program-head/responses/",
  },
  {
    appRoute:
      "/program-head/programs/:programId/responses/program-wide/:deploymentId/responses/:responseId",
    helpPath: "/program-head/responses/",
  },
  {
    appRoute: "/program-head/programs/:programId/responses/program-wide/:deploymentId",
    helpPath: "/program-head/responses/",
  },
  { appRoute: "/program-head/programs/:programId/responses", helpPath: "/program-head/responses/" },
  {
    appRoute: "/program-head/programs/:programId/cilo-reviews/:evaluationId/responses/:responseId",
    helpPath: "/program-head/outcome-alignment/",
  },
  {
    appRoute: "/program-head/programs/:programId/cilo-reviews/:evaluationId",
    helpPath: "/program-head/outcome-alignment/",
  },
  {
    appRoute: "/program-head/programs/:programId/cilo-reviews",
    helpPath: "/program-head/outcome-alignment/",
  },
  {
    appRoute: "/program-head/programs/:programId/cilo-evaluations/new",
    helpPath: "/program-head/publish-program-evaluation/",
  },
  {
    appRoute: "/program-head/programs/:programId/tools/publish",
    helpPath: "/program-head/publish-program-evaluation/",
  },
  {
    appRoute: "/program-head/programs/:programId/tools/new/from/:baselineId",
    helpPath: "/program-head/tools/",
  },
  {
    appRoute: "/program-head/programs/:programId/tools/new/blank",
    helpPath: "/program-head/tools/",
  },
  { appRoute: "/program-head/programs/:programId/tools/new", helpPath: "/program-head/tools/" },
  {
    appRoute: "/program-head/programs/:programId/tools/:id/edit",
    helpPath: "/program-head/tools/",
  },
  { appRoute: "/program-head/programs/:programId/tools", helpPath: "/program-head/tools/" },
  // The top-level `/program-head/*` tree redirects into the selected program.
  { appRoute: "/program-head/courses", helpPath: "/program-head/courses/" },
  { appRoute: "/program-head/course-assignments", helpPath: "/program-head/course-assignments/" },
  { appRoute: "/program-head/outcomes", helpPath: "/program-head/outcomes/" },
  {
    appRoute: "/program-head/tools/publish",
    helpPath: "/program-head/publish-program-evaluation/",
  },
  { appRoute: "/program-head/tools", helpPath: "/program-head/tools/" },
  { appRoute: "/program-head/responses", helpPath: "/program-head/responses/" },
  { appRoute: "/program-head/analytics", helpPath: "/program-head/analytics/" },
  { appRoute: "/program-head/reports", helpPath: "/program-head/reports/" },
  { appRoute: "/program-head/dashboard", helpPath: "/program-head/dashboard/" },
  { appRoute: "/program-head/profile", helpPath: "/start/complete-your-profile/" },

  // ------------------------------------------------------------------ Faculty
  {
    appRoute: "/faculty/cilo-evaluations/:evaluationId/responses/:responseId",
    helpPath: "/faculty/review-evaluation/",
  },
  { appRoute: "/faculty/cilo-evaluations/new", helpPath: "/faculty/publish-course-evaluation/" },
  { appRoute: "/faculty/cilo-evaluations/:evaluationId", helpPath: "/faculty/review-evaluation/" },
  { appRoute: "/faculty/cilos", helpPath: "/faculty/cilos/" },
  { appRoute: "/faculty/cilos/new", helpPath: "/faculty/cilos/" },
  { appRoute: "/faculty/cilos/:courseId/alignment", helpPath: "/faculty/outcome-alignment/" },
  { appRoute: "/faculty/course-rosters", helpPath: "/faculty/course-rosters/" },
  { appRoute: "/faculty/tools/new/from/:templateId", helpPath: "/faculty/tools/" },
  { appRoute: "/faculty/tools/new/blank", helpPath: "/faculty/tools/" },
  { appRoute: "/faculty/tools/new", helpPath: "/faculty/tools/" },
  { appRoute: "/faculty/tools/:id/edit", helpPath: "/faculty/tools/" },
  { appRoute: "/faculty/tools/published/:evaluationId", helpPath: "/faculty/review-evaluation/" },
  { appRoute: "/faculty/tools", helpPath: "/faculty/tools/" },
  { appRoute: "/faculty/analytics", helpPath: "/faculty/analytics/" },
  { appRoute: "/faculty/dashboard", helpPath: "/faculty/" },
  { appRoute: "/faculty/profile", helpPath: "/start/complete-your-profile/" },

  // Shared roster route, opened by Program Heads and Deans.
  { appRoute: "/course-rosters/:assignmentId", helpPath: "/faculty/course-rosters/" },

  // ------------------------------------------------------- Respondent roles
  { appRoute: "/student/evaluations/:id/submitted", helpPath: "/student/history/" },
  { appRoute: "/student/evaluations/:id", helpPath: "/student/complete-evaluation/" },
  { appRoute: "/student/evaluations", helpPath: "/student/evaluations/" },
  { appRoute: "/student/history/:responseId", helpPath: "/student/history/" },
  { appRoute: "/student/history", helpPath: "/student/history/" },
  { appRoute: "/student/profile", helpPath: "/start/complete-your-profile/" },
  { appRoute: "/student/dashboard", helpPath: "/student/dashboard/" },

  { appRoute: "/alumni/evaluations/:id/submitted", helpPath: "/alumni/history/" },
  { appRoute: "/alumni/evaluations/:id", helpPath: "/alumni/evaluations/" },
  { appRoute: "/alumni/evaluations", helpPath: "/alumni/evaluations/" },
  { appRoute: "/alumni/history", helpPath: "/alumni/history/" },
  { appRoute: "/alumni/profile", helpPath: "/alumni/account/" },
  { appRoute: "/alumni/dashboard", helpPath: "/alumni/" },

  {
    appRoute: "/industry-partner/evaluations/:id/submitted",
    helpPath: "/industry-partner/history/",
  },
  {
    appRoute: "/industry-partner/evaluations/:id",
    helpPath: "/industry-partner/evaluations/",
  },
  { appRoute: "/industry-partner/evaluations", helpPath: "/industry-partner/evaluations/" },
  { appRoute: "/industry-partner/history", helpPath: "/industry-partner/history/" },
  { appRoute: "/industry-partner/profile", helpPath: "/industry-partner/account/" },
  { appRoute: "/industry-partner/dashboard", helpPath: "/industry-partner/" },

  // --------------------------------------------------------------- Cross-role
  { appRoute: "/select-role", helpPath: "/start/switch-active-role/" },
  { appRoute: "/unauthorized", helpPath: "/start/understand-access/" },
];

/** Segments of an application path, ignoring empty ones. */
function segments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

/** More segments means a more specific pattern, so it wins a tie. */
function specificity(route: HelpRoute): number {
  return segments(route.appRoute).length;
}

const ROUTES_BY_SPECIFICITY = [...HELP_ROUTES].sort((a, b) => specificity(b) - specificity(a));

/**
 * Exact (per-segment) match. A `:param` placeholder matches any single segment,
 * so `/faculty/cilos/abc/alignment` resolves to the same article as the pattern.
 */
function matches(pattern: string[], actual: string[]): boolean {
  if (pattern.length !== actual.length) return false;
  return pattern.every((part, index) => part.startsWith(":") || part === actual[index]);
}

export type HelpResolution =
  | { kind: "exact"; helpPath: string }
  | { kind: "role-fallback"; helpPath: string }
  | { kind: "role-chooser"; helpPath: string };

/**
 * Resolve a pathname to a Help Center path.
 *
 * Precedence: exact route mapping -> active role landing page -> role chooser.
 * A pathname outside the authenticated app (the sign-in and registration
 * entrances, the legal documents) resolves through the same table, so those
 * pages keep working without the shell.
 */
export function resolveHelpPath(pathname: string, activeRole?: Role | null): HelpResolution {
  const actual = segments(pathname);

  for (const route of ROUTES_BY_SPECIFICITY) {
    if (matches(segments(route.appRoute), actual)) {
      return { kind: "exact", helpPath: route.helpPath };
    }
  }

  if (activeRole && ROLE_LANDING[activeRole]) {
    return { kind: "role-fallback", helpPath: `/${ROLE_LANDING[activeRole]}/` };
  }

  return { kind: "role-chooser", helpPath: ROLE_CHOOSER_PATH };
}

/** Absolute Help Center URL for the current page. */
export function resolveHelpUrl(pathname: string, activeRole?: Role | null): string {
  return `${HELP_CENTER_ORIGIN}${resolveHelpPath(pathname, activeRole).helpPath}`;
}
