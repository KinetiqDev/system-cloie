// fallow-ignore-file code-duplication
import { beforeEach, describe, expect, it, vi } from "vitest";

import { selectRows } from "@/__tests__/helpers/where-clause";
import {
  resolveLegacyCourseEvaluation,
  resolveLegacyCourseResponse,
} from "@/features/analytics/services/resolve-legacy-cilo-review-redirect";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    courseBoundEvaluation: { findFirst: vi.fn() },
    response: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

const PROGRAM = "11111111-1111-4111-8111-111111111111";
const EVALUATION = "22222222-2222-4222-8222-222222222222";
const RESPONSE = "33333333-3333-4333-8333-333333333333";

/**
 * Retired Program Head deep links resolve through these lookups before
 * redirecting. Without the course-scope gate they would resolve a General
 * Education evaluation bound to the Program Head's own Program, turning a
 * retired URL into a live route onto Coordinator-owned evidence.
 */
describe("resolveLegacyCiloReviewRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.courseBoundEvaluation.findFirst.mockResolvedValue(null);
    prismaMock.response.findFirst.mockResolvedValue(null);
  });

  describe("resolveLegacyCourseEvaluation", () => {
    it("resolves a Program-specific evaluation in the selected Program", async () => {
      prismaMock.courseBoundEvaluation.findFirst.mockResolvedValue({ id: EVALUATION });

      await expect(resolveLegacyCourseEvaluation(EVALUATION, PROGRAM)).resolves.toBe(EVALUATION);
      expect(prismaMock.courseBoundEvaluation.findFirst.mock.calls[0][0].where).toEqual({
        id: EVALUATION,
        course_assignment: {
          program_id: PROGRAM,
          course: { course_scope: "PROGRAM_SPECIFIC" },
        },
      });
    });

    it("returns null for a General Education evaluation bound to the same Program", async () => {
      // Behavioral boundary against the seeded GEETHICS shape: the retired link
      // must not resolve onto Coordinator-owned GE evidence.
      const geEvaluation = {
        id: EVALUATION,
        course_assignment: {
          program_id: PROGRAM,
          course: { course_scope: "GENERAL_EDUCATION" },
        },
      };
      prismaMock.courseBoundEvaluation.findFirst.mockImplementation(async ({ where }) =>
        selectRows(where, [geEvaluation]).length > 0 ? geEvaluation : null
      );

      await expect(resolveLegacyCourseEvaluation(EVALUATION, PROGRAM)).resolves.toBeNull();
    });

    it("rejects malformed identifiers before querying", async () => {
      await expect(resolveLegacyCourseEvaluation("not-a-uuid", PROGRAM)).resolves.toBeNull();
      await expect(resolveLegacyCourseEvaluation(EVALUATION, "nope")).resolves.toBeNull();
      expect(prismaMock.courseBoundEvaluation.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("resolveLegacyCourseResponse", () => {
    it("resolves a submitted Program-specific response", async () => {
      prismaMock.response.findFirst.mockResolvedValue({ id: RESPONSE });

      await expect(resolveLegacyCourseResponse(RESPONSE, EVALUATION, PROGRAM)).resolves.toBe(
        RESPONSE
      );
      expect(prismaMock.response.findFirst.mock.calls[0][0].where).toEqual({
        id: RESPONSE,
        status: "SUBMITTED",
        deployment_type: "COURSE_BOUND",
        assignment: {
          course_bound: {
            id: EVALUATION,
            course_assignment: {
              program_id: PROGRAM,
              course: { course_scope: "PROGRAM_SPECIFIC" },
            },
          },
        },
      });
    });

    it("returns null for a General Education response bound to the same Program", async () => {
      const geResponse = {
        id: RESPONSE,
        status: "SUBMITTED",
        deployment_type: "COURSE_BOUND",
        assignment: {
          course_bound: {
            id: EVALUATION,
            course_assignment: {
              program_id: PROGRAM,
              course: { course_scope: "GENERAL_EDUCATION" },
            },
          },
        },
      };
      prismaMock.response.findFirst.mockImplementation(async ({ where }) =>
        selectRows(where, [geResponse]).length > 0 ? geResponse : null
      );

      await expect(resolveLegacyCourseResponse(RESPONSE, EVALUATION, PROGRAM)).resolves.toBeNull();
    });

    it("rejects malformed identifiers before querying", async () => {
      await expect(resolveLegacyCourseResponse("bad", EVALUATION, PROGRAM)).resolves.toBeNull();
      await expect(resolveLegacyCourseResponse(RESPONSE, EVALUATION, "bad")).resolves.toBeNull();
      expect(prismaMock.response.findFirst).not.toHaveBeenCalled();
    });
  });
});
