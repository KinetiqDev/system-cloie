import { describe, expect, it } from "vitest";
import {
  buildQualitativeUpserts,
  buildQuantitativeUpserts,
} from "@/features/responses/services/build-draft-upserts";

/**
 * A draft save replaces only the saved section's items, so these builders are
 * the seam that keeps other sections — and values of the wrong kind — out of the
 * persisted item set. They are shared by course-bound and Central drafts.
 */

const section = {
  description: "",
  id: "section-a",
  items: [],
  name: "Section A",
};

describe("buildQuantitativeUpserts", () => {
  it("creates quantitative upserts only for the current section", () => {
    expect(
      buildQuantitativeUpserts({
        answers: {
          "section-a:qualitative:q1": 999,
          "section-a:quantitative:q1": 4,
          "section-a:quantitative:q2": 5,
          "section-b:quantitative:q1": 3,
        },
        responseId: "response-1",
        section,
        updatedAt: "2026-04-20T10:00:00.000Z",
      })
    ).toEqual([
      {
        item_key: "q1",
        rating_value: 4,
        response_id: "response-1",
        section_key: "section-a",
        updated_at: "2026-04-20T10:00:00.000Z",
      },
      {
        item_key: "q2",
        rating_value: 5,
        response_id: "response-1",
        section_key: "section-a",
        updated_at: "2026-04-20T10:00:00.000Z",
      },
    ]);
  });

  it("drops ratings that are not finite numbers", () => {
    expect(
      buildQuantitativeUpserts({
        answers: {
          "section-a:quantitative:nan": Number.NaN,
          "section-a:quantitative:infinite": Number.POSITIVE_INFINITY,
          "section-a:quantitative:text": "5",
          "section-a:quantitative:q1": 4,
        },
        responseId: "response-1",
        section,
        updatedAt: "2026-04-20T10:00:00.000Z",
      })
    ).toEqual([
      {
        item_key: "q1",
        rating_value: 4,
        response_id: "response-1",
        section_key: "section-a",
        updated_at: "2026-04-20T10:00:00.000Z",
      },
    ]);
  });

  it("keeps a rating of zero", () => {
    expect(
      buildQuantitativeUpserts({
        answers: { "section-a:quantitative:q1": 0 },
        responseId: "response-1",
        section,
        updatedAt: "2026-04-20T10:00:00.000Z",
      })
    ).toEqual([
      {
        item_key: "q1",
        rating_value: 0,
        response_id: "response-1",
        section_key: "section-a",
        updated_at: "2026-04-20T10:00:00.000Z",
      },
    ]);
  });

  it("ignores malformed answer keys", () => {
    expect(
      buildQuantitativeUpserts({
        answers: {
          "section-a:unknown:q1": 4,
          "section-a:quantitative": 4,
          q1: 4,
        },
        responseId: "response-1",
        section,
        updatedAt: "2026-04-20T10:00:00.000Z",
      })
    ).toEqual([]);
  });

  it("keeps colons inside an item key", () => {
    expect(
      buildQuantitativeUpserts({
        answers: { "section-a:quantitative:part:one": 4 },
        responseId: "response-1",
        section,
        updatedAt: "2026-04-20T10:00:00.000Z",
      })
    ).toEqual([
      {
        item_key: "part:one",
        rating_value: 4,
        response_id: "response-1",
        section_key: "section-a",
        updated_at: "2026-04-20T10:00:00.000Z",
      },
    ]);
  });
});

describe("buildQualitativeUpserts", () => {
  it("creates qualitative upserts only for the current section", () => {
    expect(
      buildQualitativeUpserts({
        answers: {
          "section-a:qualitative:remarks": "Keep the class engaging.",
          "section-a:qualitative:suggestions": "Add more lab time.",
          "section-a:quantitative:remarks": "Ignore keys with the wrong kind.",
          "section-b:qualitative:remarks": "Different section should be ignored.",
        },
        responseId: "response-1",
        section,
        updatedAt: "2026-04-20T10:00:00.000Z",
      })
    ).toEqual([
      {
        prompt_key: "remarks",
        response_id: "response-1",
        section_key: "section-a",
        text_content: "Keep the class engaging.",
        updated_at: "2026-04-20T10:00:00.000Z",
      },
      {
        prompt_key: "suggestions",
        response_id: "response-1",
        section_key: "section-a",
        text_content: "Add more lab time.",
        updated_at: "2026-04-20T10:00:00.000Z",
      },
    ]);
  });

  it("drops qualitative values that are not strings", () => {
    expect(
      buildQualitativeUpserts({
        answers: {
          "section-a:qualitative:number": 4,
          "section-a:qualitative:blank": null,
          "section-a:qualitative:remarks": "Keep the class engaging.",
        },
        responseId: "response-1",
        section,
        updatedAt: "2026-04-20T10:00:00.000Z",
      })
    ).toEqual([
      {
        prompt_key: "remarks",
        response_id: "response-1",
        section_key: "section-a",
        text_content: "Keep the class engaging.",
        updated_at: "2026-04-20T10:00:00.000Z",
      },
    ]);
  });
});
