import { describe, expect, it } from "vitest";
import { lateIncludeCourseBoundEvaluationSchema } from "@/features/evaluations/schemas/late-include-course-bound-evaluation";

const ids = {
  evaluationId: "11111111-1111-4111-8111-111111111111",
  membershipId: "22222222-2222-4222-8222-222222222222",
};

describe("late inclusion schema", () => {
  it("accepts standard reversal reasons", () => {
    expect(
      lateIncludeCourseBoundEvaluationSchema.safeParse({
        ...ids,
        reversalCategory: "ELIGIBILITY_CORRECTED",
      }).success
    ).toBe(true);
  });

  it("requires neutral explanation only for Other", () => {
    expect(
      lateIncludeCourseBoundEvaluationSchema.safeParse({
        ...ids,
        reversalCategory: "OTHER",
        reversalOtherExplanation: "Approved late participation",
      }).success
    ).toBe(true);
    expect(
      lateIncludeCourseBoundEvaluationSchema.safeParse({
        ...ids,
        reversalCategory: "OTHER",
        reversalOtherExplanation: "medical reason",
      }).success
    ).toBe(false);
    expect(
      lateIncludeCourseBoundEvaluationSchema.safeParse({
        ...ids,
        reversalCategory: "EXCLUDED_IN_ERROR",
        reversalOtherExplanation: "unneeded explanation",
      }).success
    ).toBe(false);
  });
});
