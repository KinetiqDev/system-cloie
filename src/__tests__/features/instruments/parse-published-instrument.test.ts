import { describe, expect, it } from "vitest";

import { parsePublishedInstrument } from "@/features/instruments/services/parse-published-instrument";

describe("parsePublishedInstrument", () => {
  it.each([
    {
      name: "intermediate items",
      snapshot: [
        {
          key: "section",
          title: "Section",
          items: [
            { key: "rating", kind: "quantitative", prompt: "Rate this", scale: [1, 2, 3] },
            { key: "remarks", kind: "qualitative", prompt: "Add remarks" },
          ],
        },
      ],
    },
    {
      name: "legacy split arrays",
      snapshot: [
        {
          key: "section",
          title: "Section",
          quantitative_items: [{ key: "rating", prompt: "Rate this", scale: [1, 2, 3] }],
          qualitative_prompts: [{ key: "remarks", prompt: "Add remarks" }],
        },
      ],
    },
  ])("preserves questions from $name snapshots", ({ snapshot }) => {
    const [section] = parsePublishedInstrument(snapshot);

    expect(section.questions.map((question) => question.key)).toEqual(["rating", "remarks"]);
    expect(section.questions[0]).toMatchObject({
      type: "likert",
      likertDescriptors: [
        { value: 1, label: "1" },
        { value: 2, label: "2" },
        { value: 3, label: "3" },
      ],
    });
    expect(section.questions[1]).toMatchObject({ type: "guided_open_ended" });
  });
});
