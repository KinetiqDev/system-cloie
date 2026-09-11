import { describe, expect, it } from "vitest";
import { responseSequences } from "../../../prisma/seed/fixtures/responses";

/**
 * Canonical leading answers per course. This fixture guards against a remap
 * regression that moves course feedback onto the wrong deployment, so it pins
 * the leading answers rather than mirroring the whole corpus (which grows as
 * the seed adds respondents).
 */
const expectedSubmittedFeedback: Record<string, string[]> = {
  FM200: [
    "Comparing financing options and evaluating their effect on organizational decisions made financial management concepts practical.",
    "More examples using financial ratios and management scenarios would help connect analysis to planning and control.",
  ],
  ENG2: [
    "Comparing first- and second-language acquisition theories helped me connect language learning factors to classroom practice.",
    "More classroom examples showing how acquisition theories shape instruction would strengthen my understanding.",
    "Discussing learner differences and language development made the principles easier to apply.",
  ],
  HTC401: [
    "Developing a tourism and hospitality business plan made entrepreneurial opportunity assessment practical.",
    "More local venture case studies would help us evaluate feasibility, marketing, and financial viability.",
    "Market research and budgeting exercises made the realities of hospitality entrepreneurship clearer.",
  ],
};

describe("remapped course response fixture", () => {
  for (const [courseCode, expected] of Object.entries(expectedSubmittedFeedback)) {
    it(`${courseCode} feedback matches its current course`, () => {
      const actual = responseSequences
        .filter(
          (sequence) =>
            sequence.deploymentKey.kind === "newCb" &&
            sequence.deploymentKey.courseCode === courseCode &&
            sequence.status === "SUBMITTED"
        )
        .flatMap((sequence) => sequence.qualItems.map((item) => item.text));

      expect(actual.slice(0, expected.length)).toEqual(expected);
    });
  }
});
