import { describe, expect, it } from "vitest";
import { CourseScope } from "@prisma/client";

import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import { ROLES } from "@/lib/constants/roles";
import { canManageCourseRoster, canMutateCourseRoster, canViewCourseRoster } from "@/features/course-assignments/policies";

const assignment = {
  facultyId: "faculty-1",
  programId: "program-1",
  courseScope: CourseScope.PROGRAM_SPECIFIC,
  isActive: true,
};

describe("course roster policies", () => {
  it("uses the active role rather than any role on the session", () => {
    const session = createAuthSessionSnapshot({ roles: [ROLES.STUDENT, ROLES.SECRETARY] });
    expect(canViewCourseRoster(session, assignment)).toEqual({
      allowed: false,
      reason: "Course assignment not found.",
    });
  });

  it("allows only the assigned Faculty member", () => {
    expect(canViewCourseRoster(createAuthSessionSnapshot({ userId: "faculty-1", roles: [ROLES.FACULTY] }), assignment)).toEqual({ allowed: true });
    expect(canViewCourseRoster(createAuthSessionSnapshot({ userId: "faculty-2", roles: [ROLES.FACULTY] }), assignment)).toEqual({
      allowed: false,
      reason: "Course assignment not found.",
    });
  });

  it("lets Program Heads view in-scope rosters but not manage General Education", () => {
    const session = createAuthSessionSnapshot({ roles: [ROLES.PROGRAM_HEAD] });
    expect(canViewCourseRoster(session, assignment, ["program-1"])).toEqual({ allowed: true });
    expect(canManageCourseRoster(session, { ...assignment, courseScope: CourseScope.GENERAL_EDUCATION }, ["program-1"])).toEqual({
      allowed: false,
      reason: "Program Heads cannot manage General Education assignments.",
    });
  });

  it.each([
    ["inactive assignment", { isActive: false, periodStatus: "ACTIVE", hasPublishedEvaluation: false }, "INACTIVE_ASSIGNMENT"],
    ["inactive period", { isActive: true, periodStatus: "COMPLETED", hasPublishedEvaluation: false }, "INACTIVE_ACADEMIC_PERIOD"],
    ["published evaluation", { isActive: true, periodStatus: "ACTIVE", hasPublishedEvaluation: true }, "PUBLISHED_EVALUATION_LOCK"],
  ])("rejects writes for %s", (_, context, reason) => {
    expect(canMutateCourseRoster(context as never)).toEqual({ allowed: false, reason });
  });
});
