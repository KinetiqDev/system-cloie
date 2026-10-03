import { describe, expect, it } from "vitest";
import { assertSubmissionIsAllowed } from "@/features/responses/services/assert-submission-is-allowed";

/**
 * Submission completeness is shared by every answering surface, so it is
 * exercised directly here against each snapshot format the Responses contract
 * must keep accepting.
 */

// A published snapshot can carry both the intermediate `items` array and the
// legacy arrays; format detection reads `items` first.
const combinedSnapshot = [
  {
    key: "section-a",
    title: "Section A",
    items: [
      { key: "remarks", kind: "qualitative", prompt: "Share your remarks." },
      { key: "q1", kind: "quantitative", prompt: "Rate the instructor." },
    ],
    qualitative_prompts: [{ key: "remarks", prompt: "Share your remarks." }],
    quantitative_items: [{ key: "q1", prompt: "Rate the instructor." }],
  },
] as const;

// A legacy snapshot predates both discriminators, so only the separate arrays
// declare its required answers.
const legacySnapshot = [
  {
    key: "section-a",
    title: "Section A",
    qualitative_prompts: [{ key: "remarks", prompt: "Share your remarks." }],
    quantitative_items: [{ key: "q1", prompt: "Rate the instructor." }],
  },
] as const;

describe("assertSubmissionIsAllowed", () => {
  it("rejects when required answers are missing", () => {
    expect(() =>
      assertSubmissionIsAllowed({
        answers: {
          "section-a:quantitative:q1": 4,
        },
        structureSnapshot: combinedSnapshot,
      })
    ).toThrowError("Missing required answers: section-a:qualitative:remarks");
  });

  it("reports every missing key across sections in one error", () => {
    expect(() =>
      assertSubmissionIsAllowed({
        answers: {},
        structureSnapshot: [
          ...legacySnapshot,
          { key: "section-b", title: "Section B", quantitative_items: [{ key: "q9" }] },
        ],
      })
    ).toThrowError(
      "Missing required answers: section-a:quantitative:q1, section-a:qualitative:remarks, section-b:quantitative:q9"
    );
  });

  it("treats a non-finite quantitative value as unanswered", () => {
    expect(() =>
      assertSubmissionIsAllowed({
        answers: {
          "section-a:quantitative:q1": Number.NaN,
          "section-a:qualitative:remarks": "Clear and helpful explanations.",
        },
        structureSnapshot: legacySnapshot,
      })
    ).toThrowError("Missing required answers: section-a:quantitative:q1");
  });

  it("treats a whitespace-only qualitative value as unanswered", () => {
    expect(() =>
      assertSubmissionIsAllowed({
        answers: {
          "section-a:quantitative:q1": 4,
          "section-a:qualitative:remarks": "   ",
        },
        structureSnapshot: legacySnapshot,
      })
    ).toThrowError("Missing required answers: section-a:qualitative:remarks");
  });

  it("allows optional qualitative items (required: false) to remain blank", () => {
    const snapshot = [
      {
        key: "section-a",
        title: "Section A",
        items: [
          {
            key: "q1",
            kind: "quantitative",
            prompt: "Rate the instructor.",
            scale: [1, 2, 3, 4, 5],
            required: true,
          },
          {
            key: "remarks",
            kind: "qualitative",
            prompt: "Share your remarks.",
            required: false,
          },
        ],
      },
    ];

    expect(() =>
      assertSubmissionIsAllowed({
        answers: { "section-a:quantitative:q1": 4 },
        structureSnapshot: snapshot,
      })
    ).not.toThrow();
  });

  it("enforces required items in the questions format", () => {
    const snapshot = [
      {
        key: "section-a",
        title: "Section A",
        questions: [
          { key: "q1", type: "likert", prompt: "Rate the instructor.", required: true },
          { key: "remarks", type: "guided_open_ended", prompt: "Share your remarks." },
        ],
      },
    ];

    expect(() =>
      assertSubmissionIsAllowed({
        answers: { "section-a:quantitative:q1": 4 },
        structureSnapshot: snapshot,
      })
    ).toThrowError("Missing required answers: section-a:qualitative:remarks");
  });

  it("allows optional quantitative items (required: false) to remain blank", () => {
    const snapshot = [
      {
        key: "section-a",
        title: "Section A",
        items: [
          {
            key: "optional-likert",
            kind: "quantitative",
            prompt: "Optional rating.",
            scale: [1, 2, 3, 4, 5],
            required: false,
          },
          {
            key: "required-likert",
            kind: "quantitative",
            prompt: "Required rating.",
            scale: [1, 2, 3, 4, 5],
            required: true,
          },
        ],
      },
    ];

    expect(() =>
      assertSubmissionIsAllowed({
        answers: { "section-a:quantitative:required-likert": 4 },
        structureSnapshot: snapshot,
      })
    ).not.toThrow();
  });

  it("allows blank optional questions in the questions format", () => {
    const snapshot = [
      {
        key: "section-a",
        title: "Section A",
        questions: [
          { key: "q1", type: "likert", prompt: "Rate the instructor.", required: true },
          {
            key: "remarks",
            type: "guided_open_ended",
            prompt: "Share your remarks.",
            required: false,
          },
        ],
      },
    ];

    expect(() =>
      assertSubmissionIsAllowed({
        answers: { "section-a:quantitative:q1": 4 },
        structureSnapshot: snapshot,
      })
    ).not.toThrow();
  });

  it("allows blank optional quantitative questions in the questions format", () => {
    const snapshot = [
      {
        key: "phase-3",
        title: "Phase 3 Section",
        questions: [
          {
            key: "optional-likert",
            type: "likert",
            prompt: "Optional Likert.",
            required: false,
          },
          { key: "required-likert", type: "likert", prompt: "Required Likert.", required: true },
        ],
      },
    ];

    expect(() =>
      assertSubmissionIsAllowed({
        answers: { "phase-3:quantitative:required-likert": 3 },
        structureSnapshot: snapshot,
      })
    ).not.toThrow();
  });

  it("requires every answer when the intermediate format omits the required flag", () => {
    const snapshot = [
      {
        key: "section-a",
        title: "Section A",
        items: [
          { key: "q1", kind: "quantitative", prompt: "Rate the instructor." },
          { key: "remarks", kind: "qualitative", prompt: "Share your remarks." },
        ],
      },
    ];

    expect(() =>
      assertSubmissionIsAllowed({
        answers: { "section-a:quantitative:q1": 4 },
        structureSnapshot: snapshot,
      })
    ).toThrowError("Missing required answers: section-a:qualitative:remarks");
  });

  it("requires legacy items in both arrays when answered", () => {
    expect(() =>
      assertSubmissionIsAllowed({
        answers: {
          "section-a:quantitative:q1": 4,
          "section-a:qualitative:remarks": "Clear and helpful explanations.",
        },
        structureSnapshot: legacySnapshot,
      })
    ).not.toThrow();
  });
});
