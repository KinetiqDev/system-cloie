import { describe, expect, it } from "vitest";
import { CourseScope } from "@prisma/client";
import { getCourseScopeBadgeClass } from "@/features/academic-structure/lib/course-visuals";

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

});
