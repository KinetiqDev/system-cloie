import { describe, expect, it } from "vitest";
import { YearLevel } from "@prisma/client";
import { requireCourseAssignment } from "../../../prisma/seed/helpers/assignments";

/**
 * Regression test for the seed startup assertion in seedEvaluations.
 *
 * The assertion at prisma/seed/helpers/assignments.ts guards against missing full course-assignment
 * identity mappings before creating course-bound evaluations.
 *
 * We unit-test the extracted assertion logic directly — no Prisma needed.
 */

/**
 * The helper import must not execute seed orchestration or connect to Prisma.
 */

describe("seed startup assertion — seedEvaluations assignment map guard", () => {
  it("throws with a descriptive error when courseCode is missing from assignmentMap", () => {
    const assignmentMap = new Map<string, string>([
      ["FM200:BSBA:SECOND_YEAR:AFTERNOON", "assignment-fin-001"],
      ["ENG2:BSED:THIRD_YEAR:MORNING", "assignment-educ-001"],
    ]);

    expect(() => requireCourseAssignment(assignmentMap, "IT201", "BSIT", YearLevel.SECOND_YEAR, "MORNING")).toThrowError(
      "Missing course assignment for IT201"
    );
  });

  it("throws for any missing courseCode (not just IT201)", () => {
    const emptyMap = new Map<string, string>();

    expect(() => requireCourseAssignment(emptyMap, "MM201", "BSBA", YearLevel.FOURTH_YEAR, "MORNING")).toThrowError(
      "Missing course assignment for MM201"
    );
  });

  it("returns the assignment id when the courseCode is present", () => {
    const assignmentMap = new Map<string, string>([["IT201:BSIT:SECOND_YEAR:MORNING", "assignment-it-001"]]);

    const result = requireCourseAssignment(assignmentMap, "IT201", "BSIT", YearLevel.SECOND_YEAR, "MORNING");

    expect(result).toBe("assignment-it-001");
  });

  it("throws when assignmentMap is empty regardless of courseCode", () => {
    const emptyMap = new Map<string, string>();

    expect(() => requireCourseAssignment(emptyMap, "SW312", "BSSW", YearLevel.THIRD_YEAR, "MORNING")).toThrowError(
      "Missing course assignment for SW312"
    );
  });
});
