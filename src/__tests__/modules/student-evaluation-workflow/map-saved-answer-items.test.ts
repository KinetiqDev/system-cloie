import { describe, expect, it } from "vitest";
import { mapSavedAnswerItems } from "@/features/responses/services/map-saved-answer-items";

/**
 * Resuming a draft hydrates the wizard from stored items, so both item kinds are
 * flattened onto the answer keys the browser reads.
 */

describe("mapSavedAnswerItems", () => {
  it("flattens quantitative and qualitative response items into explicit answer keys", () => {
    expect(
      mapSavedAnswerItems({
        qualitativeItems: [
          {
            prompt_key: "remarks",
            section_key: "section-b",
            text_content: "More hands-on activities would help.",
          },
        ],
        quantitativeItems: [
          {
            item_key: "q1",
            rating_value: 4,
            section_key: "section-a",
          },
          {
            item_key: "q2",
            rating_value: 5,
            section_key: "section-a",
          },
        ],
      })
    ).toEqual({
      "section-b:qualitative:remarks": "More hands-on activities would help.",
      "section-a:quantitative:q1": 4,
      "section-a:quantitative:q2": 5,
    });
  });

  it("returns an empty answer map when nothing is stored", () => {
    expect(mapSavedAnswerItems({ qualitativeItems: [], quantitativeItems: [] })).toEqual({});
  });

  it("keeps a zero rating and empty stored text", () => {
    expect(
      mapSavedAnswerItems({
        qualitativeItems: [{ prompt_key: "remarks", section_key: "section-a", text_content: "" }],
        quantitativeItems: [{ item_key: "q1", rating_value: 0, section_key: "section-a" }],
      })
    ).toEqual({
      "section-a:qualitative:remarks": "",
      "section-a:quantitative:q1": 0,
    });
  });
});
