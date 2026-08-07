import { describe, expect, it } from "vitest";
import { CourseScope } from "@prisma/client";
import {
  getCourseScopeBadgeClass,
  getCourseTypeBadgeClass,
} from "@/features/academic-structure/lib/course-visuals";

describe("course-visuals", () => {
  it("maps general education scope to the general education chip", () => {
    expect(getCourseScopeBadgeClass(CourseScope.GENERAL_EDUCATION)).toBe(
      "border-chart-3/30 bg-chart-3/15 text-foreground"
    );
  });

  it("maps program-specific scope to the program-wide chip", () => {
    expect(getCourseScopeBadgeClass(CourseScope.PROGRAM_SPECIFIC)).toBe(
      "border-chart-1/30 bg-chart-1/15 text-foreground"
    );
  });

  it("distinguishes major-specific courses by major presence", () => {
    expect(getCourseTypeBadgeClass(CourseScope.PROGRAM_SPECIFIC, "major-1")).toBe(
      "border-chart-4/30 bg-chart-4/15 text-foreground"
    );
    expect(getCourseTypeBadgeClass(CourseScope.PROGRAM_SPECIFIC, null)).toBe(
      "border-chart-1/30 bg-chart-1/15 text-foreground"
    );
  });

  it("keeps general education on the general chip regardless of major", () => {
    expect(getCourseTypeBadgeClass(CourseScope.GENERAL_EDUCATION, "major-1")).toBe(
      "border-chart-3/30 bg-chart-3/15 text-foreground"
    );
  });
});
