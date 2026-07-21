import { describe, expect, it } from "vitest";

import {
  getDeanActiveGroup,
  getDeanActiveItem,
  getDeanNavGroups,
  getHighestNavRole,
  getMainNavByRoles,
  getMobileNavByRoles,
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

  it("marks deepest Dean route active and keeps its parent group discoverable", () => {
    expect(getDeanActiveItem("/dean/academic-structure/courses/abc/edit")?.name).toBe("Courses");
    expect(getDeanActiveGroup("/dean/academic-structure/courses/abc/edit")?.name).toBe("Academic Structure");
    expect(getDeanNavGroups().find((group) => group.name === "College Oversight")?.items.map((item) => item.name)).toEqual([
      "Learning Outcomes",
      "Enrollments",
    ]);
  });
});
