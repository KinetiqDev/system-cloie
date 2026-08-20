import { describe, expect, it } from "vitest";

import {
  addRosterMembershipSchema,
  confirmRosterResolutionSchema,
  previewCourseRosterSchema,
} from "@/features/course-assignments/schemas/course-assignment";
import {
  COURSE_ROSTER_MAX_ROWS,
  parseCourseRosterCsv,
} from "@/features/course-assignments/services/course-roster-csv";

const assignmentId = "11111111-1111-4111-8111-111111111111";
const userIdA = "44444444-4444-4444-8444-444444444444";
const userIdB = "55555555-5555-4555-8555-555555555555";

describe("addRosterMembershipSchema", () => {
  it("requires a Student account id, not an email", () => {
    expect(
      addRosterMembershipSchema.safeParse({
        assignmentId,
        studentUserId: userIdA,
      }).success
    ).toBe(true);

    expect(
      addRosterMembershipSchema.safeParse({
        assignmentId,
        studentUserId: "student@example.com",
      }).success
    ).toBe(false);
  });
});

describe("confirmRosterResolutionSchema", () => {
  const valid = {
    assignmentId,
    rows: [{ sourceIndex: 0, studentUserId: userIdA }],
    skippedIndexes: [1],
    suggestedAcknowledged: true,
  };

  it("accepts a valid confirmation request", () => {
    expect(confirmRosterResolutionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects duplicate identities across actionable rows", () => {
    const result = confirmRosterResolutionSchema.safeParse({
      ...valid,
      rows: [
        { sourceIndex: 0, studentUserId: userIdA },
        { sourceIndex: 2, studentUserId: userIdA },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("rows"))).toBe(true);
    }
  });

  it("rejects a source row confirmed more than once", () => {
    const result = confirmRosterResolutionSchema.safeParse({
      ...valid,
      rows: [
        { sourceIndex: 0, studentUserId: userIdA },
        { sourceIndex: 0, studentUserId: userIdB },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a row that is both confirmed and skipped", () => {
    const result = confirmRosterResolutionSchema.safeParse({
      ...valid,
      rows: [{ sourceIndex: 0, studentUserId: userIdA }],
      skippedIndexes: [0],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("skippedIndexes"))).toBe(
        true
      );
    }
  });

  it("rejects duplicate skipped indexes", () => {
    const result = confirmRosterResolutionSchema.safeParse({
      ...valid,
      skippedIndexes: [1, 1],
    });
    expect(result.success).toBe(false);
  });

  it("accepts the full 100-row CSV line-number boundary", () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({
      sourceIndex: index + 2,
      studentUserId: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    }));
    const result = confirmRosterResolutionSchema.safeParse({
      ...valid,
      rows,
      skippedIndexes: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts source indexes from blank-row-tolerant files", () => {
    const result = confirmRosterResolutionSchema.safeParse({
      ...valid,
      rows: [{ sourceIndex: 102, studentUserId: userIdA }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an oversized skipped list", () => {
    const result = confirmRosterResolutionSchema.safeParse({
      ...valid,
      skippedIndexes: Array.from({ length: 101 }, (_, index) => index),
    });
    expect(result.success).toBe(false);
  });

  it("accepts either acknowledgement flag value at the schema boundary", () => {
    const result = confirmRosterResolutionSchema.safeParse({
      ...valid,
      suggestedAcknowledged: false,
    });
    expect(result.success).toBe(true);
    expect(result.data?.suggestedAcknowledged).toBe(false);
  });

  it("accepts an over-200-character submitted name as an invalid preview row", () => {
    const result = previewCourseRosterSchema.safeParse({
      assignmentId,
      rows: [
        { sourceIndex: 2, submittedName: "Maria Santos", status: "VALID" },
        { sourceIndex: 3, submittedName: "a".repeat(201), status: "INVALID_NAME" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts confirming every row parsed from a 100-student CSV", () => {
    const names = Array.from(
      { length: COURSE_ROSTER_MAX_ROWS },
      (_, index) => `Student ${index + 1}`
    );
    const parsed = parseCourseRosterCsv(`name\n${names.join("\n")}\n`);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.rows[0]?.sourceIndex).toBe(2);
    expect(parsed.rows[parsed.rows.length - 1]?.sourceIndex).toBe(COURSE_ROSTER_MAX_ROWS + 1);
    const rows = parsed.rows.map((row, index) => ({
      sourceIndex: row.sourceIndex,
      studentUserId: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    }));
    const result = confirmRosterResolutionSchema.safeParse({
      ...valid,
      rows,
      skippedIndexes: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts skipping the final physical lines of a 100-student CSV", () => {
    const names = Array.from(
      { length: COURSE_ROSTER_MAX_ROWS },
      (_, index) => `Student ${index + 1}`
    );
    const parsed = parseCourseRosterCsv(`name\n${names.join("\n")}\n`);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.rows).toHaveLength(COURSE_ROSTER_MAX_ROWS);
    expect(parsed.rows[parsed.rows.length - 1]?.sourceIndex).toBe(COURSE_ROSTER_MAX_ROWS + 1);
    const skipped = [COURSE_ROSTER_MAX_ROWS, COURSE_ROSTER_MAX_ROWS + 1];
    const rows = parsed.rows
      .filter((row) => !skipped.includes(row.sourceIndex))
      .map((row, index) => ({
        sourceIndex: row.sourceIndex,
        studentUserId: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      }));
    const result = confirmRosterResolutionSchema.safeParse({
      ...valid,
      rows,
      skippedIndexes: skipped,
    });
    expect(result.success).toBe(true);
  });

  it("accepts parsed indexes shifted past the header by a blank line", () => {
    const names = Array.from(
      { length: COURSE_ROSTER_MAX_ROWS },
      (_, index) => `Student ${index + 1}`
    );
    const parsed = parseCourseRosterCsv(`name\n\n${names.join("\n")}\n  \n`);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.rows[parsed.rows.length - 1]?.sourceIndex).toBe(COURSE_ROSTER_MAX_ROWS + 2);
    const rows = parsed.rows.map((row, index) => ({
      sourceIndex: row.sourceIndex,
      studentUserId: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    }));
    const result = confirmRosterResolutionSchema.safeParse({
      ...valid,
      rows,
      skippedIndexes: [],
    });
    expect(result.success).toBe(true);
  });
});
