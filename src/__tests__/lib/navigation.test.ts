import { describe, expect, it } from "vitest";

import {
  getDeanActiveGroup,
  getDeanActiveItem,
  getDeanNavGroups,
  getHighestNavRole,
  getMainNavByRoles,
  getMobileNavByRoles,
  getMobileNavMode,
  getProgramHeadNav,
  getProgramHeadProgramIdFromPathname,
  isNavItemActive,
} from "@/lib/constants/navigation";
import { ROLES } from "@/lib/constants/roles";

describe("navigation helpers", () => {
  it("secretary navigation hrefs start with /secretary/", () => {
    const secretaryNav = getMainNavByRoles([ROLES.SECRETARY]);
    expect(secretaryNav.length).toBeGreaterThan(0);
    secretaryNav.forEach((item) => {
      expect(item.href).toMatch(/^\/secretary\//);
    });
  });

  it("secretary navigation includes course assignments", () => {
    const secretaryNav = getMainNavByRoles([ROLES.SECRETARY]);
    expect(secretaryNav.map((item) => item.href)).toContain("/secretary/course-assignments");
    expect(secretaryNav.find((item) => item.href === "/secretary/course-assignments")?.name).toBe(
      "Course Assignments"
    );
  });

  it("orders faculty navigation correctly", () => {
    expect(getMainNavByRoles([ROLES.FACULTY]).map((item) => item.name)).toEqual([
      "Dashboard",
      "My Course Rosters",
      "Manage CILOs",
      "Tools",
      "Profile",
    ]);
    expect(getMainNavByRoles([ROLES.FACULTY]).map((item) => item.href)).not.toContain(
      "/faculty/analytics"
    );
  });

  it("does not include cilo-reviews in program head and dean nav", () => {
    expect(getMainNavByRoles([ROLES.PROGRAM_HEAD]).map((item) => item.href)).not.toContain(
      "/program-head/cilo-reviews"
    );
    expect(getMainNavByRoles([ROLES.DEAN]).map((item) => item.href)).not.toContain(
      "/dean/cilo-reviews"
    );
    expect(getMobileNavByRoles([ROLES.PROGRAM_HEAD]).map((item) => item.href)).not.toContain(
      "/program-head/cilo-reviews"
    );
    expect(getMobileNavByRoles([ROLES.DEAN]).map((item) => item.href)).not.toContain(
      "/dean/cilo-reviews"
    );
  });

  it("preserves the selected Program in Program Head management navigation", () => {
    const hrefs = getProgramHeadNav("/program-head/programs/program-2/outcomes/mapping").map(
      (item) => item.href
    );

    expect(hrefs).toEqual([
      "/program-head/programs/program-2/dashboard",
      "/program-head/programs/program-2/courses",
      "/program-head/programs/program-2/course-assignments",
      "/program-head/programs/program-2/outcomes",
      "/program-head/programs/program-2/tools",
      "/program-head/programs/program-2/analytics",
      "/program-head/programs/program-2/reports",
      "/program-head/profile",
    ]);
  });

  it("returns Program Head management navigation to entry when no context is selected", () => {
    expect(getProgramHeadNav("/program-head/profile").map((item) => item.href)).toEqual([
      "/program-head",
      "/program-head",
      "/program-head",
      "/program-head",
      "/program-head",
      "/program-head",
      "/program-head",
      "/program-head/profile",
    ]);
  });

  it("extracts only the canonical dynamic Program segment", () => {
    expect(getProgramHeadProgramIdFromPathname("/program-head/programs/program-2/tools/new")).toBe(
      "program-2"
    );
    expect(getProgramHeadProgramIdFromPathname("/program-head/programs/program-2x")).toBe(
      "program-2x"
    );
    expect(getProgramHeadProgramIdFromPathname("/program-head/profile")).toBeNull();
    expect(getProgramHeadProgramIdFromPathname("/program-head/programs/%E0%A4%A")).toBeNull();
  });

  it("exposes grouped canonical Dean navigation", () => {
    const deanNav = getMainNavByRoles([ROLES.DEAN]);
    expect(deanNav.map((item) => item.href)).toEqual([
      "/dean/dashboard",
      "/dean/academic-structure",
      "/dean/college-oversight",
      "/dean/profile",
    ]);
    expect(getMobileNavByRoles([ROLES.DEAN]).map((item) => item.href)).toEqual(deanNav.map((item) => item.href));
  });

  it("prefers dean and program-head navigation over faculty navigation for multi-role reviewers", () => {
    expect(
      getMainNavByRoles([ROLES.FACULTY, ROLES.PROGRAM_HEAD]).map((item) => item.href)
    ).not.toContain("/faculty/cilo-evaluations");
    expect(getMobileNavByRoles([ROLES.FACULTY, ROLES.DEAN]).map((item) => item.href)).not.toContain(
      "/faculty/cilo-evaluations"
    );
  });

  it("uses one highest role for navigation and layout decisions", () => {
    expect(getHighestNavRole([ROLES.DEAN, ROLES.SECRETARY])).toBe(ROLES.SECRETARY);
    expect(getMainNavByRoles([ROLES.DEAN, ROLES.SECRETARY])[0]?.href).toBe(
      "/secretary/dashboard"
    );
    expect(getMobileNavByRoles([ROLES.DEAN, ROLES.SECRETARY])[0]?.href).toBe(
      "/secretary/dashboard"
    );
  });

  it("uses the drawer as the only Dean mobile navigation surface", () => {
    expect(getMobileNavMode([ROLES.DEAN])).toBe("hamburger");
  });

  it("marks deepest Dean route active and keeps its parent group discoverable", () => {
    expect(getDeanActiveItem("/dean/academic-structure/courses/abc/edit")?.name).toBe("Courses");
    expect(getDeanActiveGroup("/dean/academic-structure/courses/abc/edit")?.name).toBe("Academic Structure");
    expect(getDeanNavGroups().find((group) => group.name === "College Oversight")?.items.map((item) => item.name)).toEqual([
      "Learning Outcomes",
      "Enrollments",
    ]);
  });

  it.each([
    ["/dean/academic-structure", "Academic Structure"],
    ["/dean/academic-structure/", "Academic Structure"],
    ["/dean/academic-structure/courses/abc/edit", "Courses"],
    ["/dean/college-oversight/enrollments/abc", "Enrollments"],
    ["/dean/profile/details", "Profile"],
  ])("selects one deepest destination for %s", (pathname, expectedName) => {
    expect(getDeanActiveItem(pathname)?.name).toBe(expectedName);
  });

  it("matches route prefixes only at segment boundaries", () => {
    expect(isNavItemActive("/dean/dashboard/details", "/dean/dashboard")).toBe(true);
    expect(isNavItemActive("/dean/dashboarding", "/dean/dashboard")).toBe(false);
  });
});
