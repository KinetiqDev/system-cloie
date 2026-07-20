import { describe, expect, it } from "vitest";

/**
 * Regression test for the seed startup assertion in seedEvaluations.
 *
 * The assertion at prisma/seed.ts guards against missing full course-assignment
 * identity mappings before creating course-bound evaluations.
 *
 * We extract and unit-test the assertion logic directly — no Prisma needed.
 */

/**
 * Mirrors the composite key used by prisma/seed.ts seedEvaluations:
 *   const cbAssignmentId = assignmentMap.get(courseAssignmentKey(...));
 *   if (!cbAssignmentId) {
 *     throw new Error(`Missing course assignment for ${def.courseCode}`);
 *   }
 */
function assertCourseAssignmentPresent(
  assignmentMap: Map<string, string>,
  courseCode: string,
  programCode: string,
  yearLevel: string,
  section: string
): string {
  const key = `${courseCode}:${programCode}:${yearLevel}:${section}`;
  const cbAssignmentId = assignmentMap.get(key);
  if (!cbAssignmentId) {
    throw new Error(`Missing course assignment for ${courseCode}`);
  }
  return cbAssignmentId;
}

describe("seed startup assertion — seedEvaluations assignment map guard", () => {
  it("throws with a descriptive error when courseCode is missing from assignmentMap", () => {
    const assignmentMap = new Map<string, string>([
      ["FIN101:BSBA:SECOND_YEAR:AFTERNOON", "assignment-fin-001"],
      ["EDUC301:BSED:THIRD_YEAR:MORNING", "assignment-educ-001"],
    ]);

    expect(() => assertCourseAssignmentPresent(assignmentMap, "IT201", "BSIT", "SECOND_YEAR", "MORNING")).toThrowError(
      "Missing course assignment for IT201"
    );
  });

  it("throws for any missing courseCode (not just IT201)", () => {
    const emptyMap = new Map<string, string>();

    expect(() => assertCourseAssignmentPresent(emptyMap, "MKT301", "BSBA", "FOURTH_YEAR", "MORNING")).toThrowError(
      "Missing course assignment for MKT301"
    );
  });

  it("returns the assignment id when the courseCode is present", () => {
    const assignmentMap = new Map<string, string>([["IT201:BSIT:SECOND_YEAR:MORNING", "assignment-it-001"]]);

    const result = assertCourseAssignmentPresent(assignmentMap, "IT201", "BSIT", "SECOND_YEAR", "MORNING");

    expect(result).toBe("assignment-it-001");
  });

  it("throws when assignmentMap is empty regardless of courseCode", () => {
    const emptyMap = new Map<string, string>();

    expect(() => assertCourseAssignmentPresent(emptyMap, "SW301", "BSSW", "THIRD_YEAR", "MORNING")).toThrowError(
      "Missing course assignment for SW301"
    );
  });
});
