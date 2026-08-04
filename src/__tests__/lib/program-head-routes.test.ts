import { describe, expect, it } from "vitest";
import {
  buildProgramHeadCoursesPath,
  buildProgramHeadDashboardPath,
  buildProgramHeadProgramPath,
  buildProgramHeadCourseRosterPath,
} from "@/lib/constants/program-head-routes";

describe("Program Head routes", () => {
  it("builds the canonical selected Program dashboard path", () => {
    expect(buildProgramHeadDashboardPath("program-1")).toBe("/program-head/programs/program-1/dashboard");
  });

  it("builds child paths without duplicate separators", () => {
    expect(buildProgramHeadProgramPath("program-1", "/courses")).toBe("/program-head/programs/program-1/courses");
  });

  it("builds the canonical selected Program Courses path", () => {
    expect(buildProgramHeadCoursesPath("program-1")).toBe("/program-head/programs/program-1/courses");
  });

  it("builds the canonical selected Program roster path", () => {
    expect(buildProgramHeadCourseRosterPath("program-1", "assignment-1")).toBe(
      "/program-head/programs/program-1/course-rosters/assignment-1"
    );
  });

  it("encodes dynamic Program IDs in canonical paths", () => {
    expect(buildProgramHeadDashboardPath("program/1")).toBe(
      "/program-head/programs/program%2F1/dashboard"
    );
  });
});
