import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { Role } from "@/lib/constants/roles";
import {
  HELP_CENTER_ORIGIN,
  HELP_ROUTES,
  ROLE_CHOOSER_PATH,
  resolveHelpPath,
  resolveHelpUrl,
} from "./help-center-links";

/**
 * The fallback chain is the whole contract of this module: a documentation URL
 * must never 404, whatever route a person lands on. These assertions are the
 * cheap guard for that — every route family in the application must resolve to
 * either an exact article or a role landing page, never to nothing.
 */
describe("resolveHelpPath", () => {
  it("maps the examples named in the Help Center plan", () => {
    expect(resolveHelpPath("/program-head/programs/abc-123/outcomes").helpPath).toBe(
      "/program-head/outcomes/"
    );
    expect(resolveHelpPath("/faculty/cilos").helpPath).toBe("/faculty/cilos/");
    expect(resolveHelpPath("/student/evaluations").helpPath).toBe("/student/evaluations/");
  });

  it("sends audience landing pages to the appropriate public guides", () => {
    expect(resolveHelpUrl("/entry/student")).toBe("https://help.system-cloie.app/student/");
    expect(resolveHelpUrl("/entry/staff")).toBe("https://help.system-cloie.app/");
    expect(resolveHelpUrl("/entry/external")).toBe("https://help.system-cloie.app/");
  });

  it("never leaks dynamic ids into a Help Center URL", () => {
    const resolved = resolveHelpPath("/program-head/programs/abc-123/responses/program-wide/dep-9");
    expect(resolved.helpPath).toBe("/program-head/responses/");
    expect(resolved.helpPath).not.toContain("abc-123");
    expect(resolved.helpPath).not.toContain("dep-9");
  });

  it("matches :param segments without caring what they contain", () => {
    expect(resolveHelpPath("/faculty/cilos/9f2c1a/alignment").helpPath).toBe(
      "/faculty/outcome-alignment/"
    );
    expect(resolveHelpPath("/course-rosters/7b7b/").helpPath).toBe("/faculty/course-rosters/");
  });

  it("prefers the most specific mapping, not the first declared", () => {
    // `/program-head/tools/publish` must not be swallowed by `/program-head/tools`.
    expect(resolveHelpPath("/program-head/tools/publish").helpPath).toBe(
      "/program-head/publish-program-evaluation/"
    );
    // A deeper rollover route must not be swallowed by the school-year route.
    expect(resolveHelpPath("/secretary/school-years/42/rollover").helpPath).toBe(
      "/secretary/term-rollover/"
    );
  });

  it("falls back to the active role's landing page for an unmapped route", () => {
    expect(resolveHelpPath("/faculty/some-brand-new-page", "FACULTY")).toEqual({
      kind: "role-fallback",
      helpPath: "/faculty/",
    });
    expect(resolveHelpPath("/dean/another-new-page", "DEAN").helpPath).toBe("/dean/");
    expect(resolveHelpPath("/student/new", "STUDENT").helpPath).toBe("/student/");
    expect(resolveHelpPath("/alumni/new", "ALUMNI").helpPath).toBe("/alumni/");
    expect(resolveHelpPath("/industry-partner/new", "INDUSTRY_PARTNER").helpPath).toBe(
      "/industry-partner/"
    );
    expect(resolveHelpPath("/secretary/new", "SECRETARY").helpPath).toBe("/secretary/");
    expect(resolveHelpPath("/program-head/new", "PROGRAM_HEAD").helpPath).toBe("/program-head/");
    expect(resolveHelpPath("/gen-ed-coordinator/new", "GEN_ED_COORDINATOR").helpPath).toBe(
      "/gen-ed-coordinator/"
    );
  });

  it("falls back to the role chooser when no role is active", () => {
    expect(resolveHelpPath("/login")).toEqual({
      kind: "role-chooser",
      helpPath: ROLE_CHOOSER_PATH,
    });
    expect(resolveHelpPath("/login", null).helpPath).toBe(ROLE_CHOOSER_PATH);
  });

  it("keeps trailing slashes and query noise out of the match", () => {
    expect(resolveHelpPath("/student/evaluations/").helpPath).toBe("/student/evaluations/");
    expect(resolveHelpPath("/student/history/?tab=2026").helpPath).toBe("/student/history/");
  });

  it("sends the shared unauthorized page to the access explainer", () => {
    expect(resolveHelpPath("/unauthorized").helpPath).toBe("/start/understand-access/");
  });
});

describe("the mapping table", () => {
  it("has no entry shadowed by a more specific one", () => {
    // If a longer pattern ever claims a route a shorter one declared, one of the
    // two articles silently stops being reachable. Concreting each `:param` to a
    // placeholder segment exposes that immediately.
    const shadowed = HELP_ROUTES.flatMap((route) => {
      const concrete = route.appRoute.replace(/:[^/]+/g, "placeholder");
      return resolveHelpPath(concrete, null).helpPath === route.helpPath
        ? []
        : [`${route.appRoute} resolves to ${resolveHelpPath(concrete, null).helpPath}`];
    });
    expect(shadowed).toEqual([]);
  });

  it("never resolves to a path carrying an application id", () => {
    const concrete = HELP_ROUTES.find((route) => /:[^/]+/.test(route.appRoute));
    expect(concrete).toBeDefined();
    const resolved = resolveHelpPath(concrete!.appRoute.replace(/:[^/]+/g, "a-real-id"), null);
    expect(resolved.helpPath).not.toContain("a-real-id");
  });

  it("covers every role with a landing-page fallback", () => {
    const roles: Role[] = [
      "SECRETARY",
      "DEAN",
      "GEN_ED_COORDINATOR",
      "PROGRAM_HEAD",
      "FACULTY",
      "STUDENT",
      "ALUMNI",
      "INDUSTRY_PARTNER",
    ];
    for (const role of roles) {
      const url = resolveHelpUrl("/a/route/that/does/not/exist", role);
      // The path after the origin must be a clean, fully-static, slash-terminated
      // route: no id-looking segment, no empty segment, no protocol-relative slip.
      expect(url.slice(HELP_CENTER_ORIGIN.length)).toMatch(/^\/[a-z0-9-]+(\/[a-z0-9-]+)*\/$/);
    }
  });
});

describe("resolveHelpUrl", () => {
  it("builds an absolute URL on the Help Center origin", () => {
    expect(resolveHelpUrl("/faculty/cilos", "FACULTY" as Role)).toBe(
      `${HELP_CENTER_ORIGIN}/faculty/cilos/`
    );
  });
});

/**
 * The structural guarantee: no page inside the authenticated `(app)` route tree
 * may fall through to the role chooser. That would send a signed-in user to
 * "who are you?" from a page they can already reach, which reads as a broken
 * link. Public `(public)`/`(legal)` pages are excluded because they render
 * outside `AppShell` and therefore never show the action at all.
 */
describe("route-tree coverage", () => {
  const APP_DIR = path.resolve(__dirname, "../../app");
  const GROUP = /\((app|public|legal)\)\//g;

  function authenticatedPages(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (/^\((?!app\))/.test(entry.name)) return [];
        return authenticatedPages(full);
      }
      return entry.name === "page.tsx" ? [full] : [];
    });
  }

  function toRoute(file: string): string {
    return (
      ("/" + path.relative(APP_DIR, path.dirname(file)).replace(GROUP, "")).replace(/\/$/, "") ||
      "/"
    );
  }

  /** Replace dynamic segments with the concrete values a request actually carries. */
  function concretise(route: string): string {
    return route
      .replace(/\[\[\.\.\.[^\]]+\]\]/g, "a-segment")
      .replace(/\[([^\]]+)\]/g, (_match, segment: string) =>
        /Id$|Id\]$/.test(segment) ? "a-real-id" : "a-segment"
      );
  }

  it("resolves every authenticated page to an article or its role landing page", () => {
    const orphans = authenticatedPages(APP_DIR)
      .map(toRoute)
      .filter((route) => route !== "/")
      .filter((route) => {
        const resolution = resolveHelpPath(concretise(route), "SECRETARY" as Role);
        return resolution.kind === "role-chooser";
      });
    expect(orphans).toEqual([]);
  });
});
