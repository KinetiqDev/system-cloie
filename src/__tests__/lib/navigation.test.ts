import { describe, expect, it } from "vitest";

import { getMainNavByRoles, getMobileNavByRoles } from "@/lib/constants/navigation";
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

  it("orders dean navigation with course assignments after courses", () => {
    const deanNav = getMainNavByRoles([ROLES.DEAN]);
    const deanHrefs = deanNav.map((item) => item.href);

    expect(deanHrefs).toContain("/dean/course-assignments");
    expect(deanNav.find((item) => item.href === "/dean/course-assignments")?.name).toBe(
      "Course Assignments"
    );

    const coursesIndex = deanHrefs.indexOf("/dean/courses");
    const courseAssignmentsIndex = deanHrefs.indexOf("/dean/course-assignments");
    expect(courseAssignmentsIndex).toBe(coursesIndex + 1);

    expect(getMobileNavByRoles([ROLES.DEAN]).map((item) => item.href)).toContain(
      "/dean/course-assignments"
    );
  });

  it("prefers dean and program-head navigation over faculty navigation for multi-role reviewers", () => {
    expect(
      getMainNavByRoles([ROLES.FACULTY, ROLES.PROGRAM_HEAD]).map((item) => item.href)
    ).not.toContain("/faculty/cilo-evaluations");
    expect(getMobileNavByRoles([ROLES.FACULTY, ROLES.DEAN]).map((item) => item.href)).not.toContain(
      "/faculty/cilo-evaluations"
    );
  });
});
