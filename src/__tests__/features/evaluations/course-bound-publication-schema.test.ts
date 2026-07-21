import { describe, expect, it } from "vitest";

import { publishCourseBoundEvaluationSchema } from "@/features/evaluations/schemas/course-bound-publication";

const baseInput = {
  assignmentId: "00000000-0000-4000-8000-000000000001",
  deploymentName: "Course evaluation",
  templateId: "00000000-0000-4000-8000-000000000002",
};

describe("publishCourseBoundEvaluationSchema", () => {
  it("accepts a standard exclusion without an explanation", () => {
    expect(
      publishCourseBoundEvaluationSchema.safeParse({
        ...baseInput,
        exclusions: [
          {
            category: "ADMINISTRATIVE_EXCEPTION",
            membershipId: "00000000-0000-4000-8000-000000000003",
          },
        ],
      }).success
    ).toBe(true);
  });

  it("accepts Other with a constrained neutral explanation", () => {
    expect(
      publishCourseBoundEvaluationSchema.safeParse({
        ...baseInput,
        exclusions: [
          {
            category: "OTHER",
            membershipId: "00000000-0000-4000-8000-000000000003",
            otherExplanation: "Not taking assessment",
          },
        ],
      }).success
    ).toBe(true);
  });

  it("rejects a short Other explanation", () => {
    expect(
      publishCourseBoundEvaluationSchema.safeParse({
        ...baseInput,
        exclusions: [
          {
            category: "OTHER",
            membershipId: "00000000-0000-4000-8000-000000000003",
            otherExplanation: "No",
          },
        ],
      }).success
    ).toBe(false);
  });

  it("rejects an explanation for a standard category", () => {
    expect(
      publishCourseBoundEvaluationSchema.safeParse({
        ...baseInput,
        exclusions: [
          {
            category: "NOT_TAKING_ASSESSMENT",
            membershipId: "00000000-0000-4000-8000-000000000003",
            otherExplanation: "Sensitive detail",
          },
        ],
      }).success
    ).toBe(false);
  });

  it("rejects sensitive medical or disciplinary detail in Other", () => {
    expect(
      publishCourseBoundEvaluationSchema.safeParse({
        ...baseInput,
        exclusions: [
          {
            category: "OTHER",
            membershipId: "00000000-0000-4000-8000-000000000003",
            otherExplanation: "Medical diagnosis requires accommodation",
          },
        ],
      }).success
    ).toBe(false);
  });

  it("rejects discipline wording consistently with the database constraint", () => {
    expect(
      publishCourseBoundEvaluationSchema.safeParse({
        ...baseInput,
        exclusions: [
          {
            category: "OTHER",
            membershipId: "00000000-0000-4000-8000-000000000003",
            otherExplanation: "Discipline-related exception",
          },
        ],
      }).success
    ).toBe(false);
  });
});
