import { describe, expect, it } from "vitest";

import {
  addRosterMembershipSchema,
  confirmRosterResolutionSchema,
} from "@/features/course-assignments/schemas/course-assignment";

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

  it("rejects source indexes beyond the row bound", () => {
    const result = confirmRosterResolutionSchema.safeParse({
      ...valid,
      rows: [{ sourceIndex: 100, studentUserId: userIdA }],
    });
    expect(result.success).toBe(false);
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
});
