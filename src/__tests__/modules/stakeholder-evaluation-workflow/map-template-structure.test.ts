import { describe, expect, it } from "vitest";
import { mapTemplateStructureToSections } from "@/features/responses/services/map-template-structure";

describe("mapTemplateStructureToSections", () => {
  describe("New Phase 3 format (questions with type)", () => {
    it("maps likert questions to quantitative items with scale", () => {
      const structure = [
        {
          key: "teaching",
          title: "Teaching Effectiveness",
          description: "Evaluate teaching quality",
          questions: [
            {
              key: "q1",
              prompt: "Rate the instructor's clarity.",
              type: "likert",
              order: 1,
              required: true,
              likertDescriptors: [
                { value: 1, label: "Poor" },
                { value: 2, label: "Fair" },
                { value: 3, label: "Good" },
                { value: 4, label: "Very Good" },
                { value: 5, label: "Excellent" },
              ],
            },
          ],
        },
      ];

      const sections = mapTemplateStructureToSections(structure);

      expect(sections).toEqual([
        {
          id: "teaching",
          name: "Teaching Effectiveness",
          description: "Evaluate teaching quality",
          items: [
            {
              kind: "quantitative" as const,
              itemKey: "q1",
              prompt: "Rate the instructor's clarity.",
              scale: [1, 2, 3, 4, 5],
              descriptorLabels: ["Poor", "Fair", "Good", "Very Good", "Excellent"],
              required: true,
            },
          ],
        },
      ]);
    });

    it("maps guided_open_ended questions to qualitative items", () => {
      const structure = [
        {
          key: "feedback",
          title: "Open Feedback",
          questions: [
            {
              key: "comments",
              prompt: "Share your overall experience.",
              type: "guided_open_ended",
              order: 1,
            },
          ],
        },
      ];

      const sections = mapTemplateStructureToSections(structure);

      expect(sections).toEqual([
        {
          id: "feedback",
          name: "Open Feedback",
          description: "",
          items: [
            {
              kind: "qualitative",
              promptKey: "comments",
              prompt: "Share your overall experience.",
              suggestedResponses: undefined,
            },
          ],
        },
      ]);
    });

    it("passes through suggestedResponses for guided open-ended questions", () => {
      const structure = [
        {
          key: "feedback",
          title: "Feedback",
          questions: [
            {
              key: "improvements",
              prompt: "What improvements would you suggest?",
              type: "guided_open_ended",
              order: 1,
              suggestedResponses: [
                "More hands-on activities",
                "Better learning materials",
                "Improved communication",
              ],
            },
          ],
        },
      ];

      const sections = mapTemplateStructureToSections(structure);

      expect(sections[0].items[0]).toEqual({
        kind: "qualitative",
        promptKey: "improvements",
        prompt: "What improvements would you suggest?",
        suggestedResponses: [
          "More hands-on activities",
          "Better learning materials",
          "Improved communication",
        ],
      });
    });

    it("extracts likertDescriptors values to scale array", () => {
      const structure = [
        {
          key: "s1",
          title: "Section",
          questions: [
            {
              key: "q1",
              prompt: "Rate.",
              type: "likert",
              likertDescriptors: [
                { value: 1, label: "Strongly Disagree" },
                { value: 2, label: "Disagree" },
                { value: 3, label: "Neutral" },
                { value: 4, label: "Agree" },
                { value: 5, label: "Strongly Agree" },
              ],
            },
          ],
        },
      ];

      const sections = mapTemplateStructureToSections(structure);
      const item = sections[0].items[0];

      expect(item.kind).toBe("quantitative");
      if (item.kind === "quantitative") {
        expect(item.scale).toEqual([1, 2, 3, 4, 5]);
      }
    });

    it("extracts likertDescriptors labels to descriptorLabels array", () => {
      const structure = [
        {
          key: "s1",
          title: "Section",
          questions: [
            {
              key: "q1",
              prompt: "Rate.",
              type: "likert",
              likertDescriptors: [
                { value: 1, label: "Poor" },
                { value: 2, label: "Good" },
                { value: 3, label: "Excellent" },
              ],
            },
          ],
        },
      ];

      const sections = mapTemplateStructureToSections(structure);
      const item = sections[0].items[0];

      expect(item.kind).toBe("quantitative");
      if (item.kind === "quantitative") {
        expect(item.descriptorLabels).toEqual(["Poor", "Good", "Excellent"]);
      }
    });

    it("sorts questions by order", () => {
      const structure = [
        {
          key: "s1",
          title: "Section",
          questions: [
            { key: "q2", prompt: "Second", type: "likert", order: 2 },
            { key: "q1", prompt: "First", type: "likert", order: 1 },
            { key: "q3", prompt: "Third", type: "guided_open_ended", order: 3 },
          ],
        },
      ];

      const sections = mapTemplateStructureToSections(structure);

      expect(sections[0].items.map((i) => i.prompt)).toEqual(["First", "Second", "Third"]);
    });

    it("passes through the required flag from questions", () => {
      const structure = [
        {
          key: "section",
          title: "Section",
          questions: [
            { key: "q1", prompt: "Q1", type: "likert", required: true },
            { key: "q2", prompt: "Q2", type: "likert", required: false },
            { key: "q3", prompt: "Q3", type: "guided_open_ended", required: false },
            { key: "q4", prompt: "Q4", type: "guided_open_ended" },
          ],
        },
      ];

      const sections = mapTemplateStructureToSections(structure);
      const items = sections[0].items;

      expect(items[0]).toMatchObject({ kind: "quantitative", itemKey: "q1", required: true });
      expect(items[1]).toMatchObject({ kind: "quantitative", itemKey: "q2", required: false });
      expect(items[2]).toMatchObject({ kind: "qualitative", promptKey: "q3", required: false });
      // When absent, required stays undefined — the validator then applies
      // the default (quantitative required, qualitative optional).
      expect(items[3]).toMatchObject({ kind: "qualitative", promptKey: "q4" });
      expect(items[3].required).toBeUndefined();
    });
  });

  describe("Old intermediate format (items with kind)", () => {
    it("maps quantitative items with scale", () => {
      const structure = [
        {
          key: "section-a",
          title: "Section A",
          description: "Test section",
          items: [
            {
              kind: "quantitative",
              key: "q1",
              prompt: "Rate the instructor.",
              scale: [1, 2, 3, 4, 5],
            },
          ],
        },
      ];

      const sections = mapTemplateStructureToSections(structure);

      expect(sections).toEqual([
        {
          id: "section-a",
          name: "Section A",
          description: "Test section",
          items: [
            {
              kind: "quantitative",
              itemKey: "q1",
              prompt: "Rate the instructor.",
              scale: [1, 2, 3, 4, 5],
            },
          ],
        },
      ]);
    });

    it("maps qualitative items", () => {
      const structure = [
        {
          key: "section-b",
          title: "Section B",
          items: [
            {
              kind: "qualitative",
              key: "remarks",
              prompt: "Share your remarks.",
            },
          ],
        },
      ];

      const sections = mapTemplateStructureToSections(structure);

      expect(sections).toEqual([
        {
          id: "section-b",
          name: "Section B",
          description: "",
          items: [
            {
              kind: "qualitative",
              promptKey: "remarks",
              prompt: "Share your remarks.",
            },
          ],
        },
      ]);
    });
  });

  describe("Legacy format (quantitative_items + qualitative_prompts)", () => {
    it("maps separate arrays into a single items list", () => {
      const structure = [
        {
          key: "section-c",
          title: "Section C",
          description: "Legacy format",
          quantitative_items: [
            { key: "q1", prompt: "Rate delivery.", scale: [1, 2, 3] },
            { key: "q2", prompt: "Rate content." },
          ],
          qualitative_prompts: [{ key: "feedback", prompt: "Any feedback?" }],
        },
      ];

      const sections = mapTemplateStructureToSections(structure);

      expect(sections).toEqual([
        {
          id: "section-c",
          name: "Section C",
          description: "Legacy format",
          items: [
            {
              kind: "quantitative",
              itemKey: "q1",
              prompt: "Rate delivery.",
              scale: [1, 2, 3],
            },
            {
              kind: "quantitative",
              itemKey: "q2",
              prompt: "Rate content.",
              scale: [],
            },
            {
              kind: "qualitative",
              promptKey: "feedback",
              prompt: "Any feedback?",
            },
          ],
        },
      ]);
    });
  });

  describe("Edge cases", () => {
    it("returns empty array for null input", () => {
      expect(mapTemplateStructureToSections(null)).toEqual([]);
    });

    it("returns empty array for undefined input", () => {
      expect(mapTemplateStructureToSections(undefined)).toEqual([]);
    });

    it("returns empty array for non-array input", () => {
      expect(mapTemplateStructureToSections("not-an-array")).toEqual([]);
      expect(mapTemplateStructureToSections(42)).toEqual([]);
      expect(mapTemplateStructureToSections({})).toEqual([]);
    });

    it("handles empty structure array", () => {
      expect(mapTemplateStructureToSections([])).toEqual([]);
    });

    it("skips sections without key or title", () => {
      const structure = [
        { title: "No Key" },
        { key: "no-title" },
        { key: "valid", title: "Valid Section", items: [] },
      ];

      const sections = mapTemplateStructureToSections(structure);

      expect(sections).toHaveLength(1);
      expect(sections[0].id).toBe("valid");
    });

    it("handles mixed sections with different formats", () => {
      const structure = [
        {
          key: "new-format",
          title: "New Format Section",
          questions: [
            {
              key: "q1",
              prompt: "Likert question",
              type: "likert",
              order: 1,
              likertDescriptors: [
                { value: 1, label: "Low" },
                { value: 5, label: "High" },
              ],
            },
          ],
        },
        {
          key: "intermediate",
          title: "Intermediate Section",
          items: [{ kind: "quantitative", key: "q2", prompt: "Rate.", scale: [1, 2, 3] }],
        },
        {
          key: "legacy",
          title: "Legacy Section",
          quantitative_items: [{ key: "q3", prompt: "Old item." }],
        },
      ];

      const sections = mapTemplateStructureToSections(structure);

      expect(sections).toHaveLength(3);
      expect(sections[0].id).toBe("new-format");
      expect(sections[1].id).toBe("intermediate");
      expect(sections[2].id).toBe("legacy");

      // New format item
      expect(sections[0].items[0].kind).toBe("quantitative");
      if (sections[0].items[0].kind === "quantitative") {
        expect(sections[0].items[0].scale).toEqual([1, 5]);
        expect(sections[0].items[0].descriptorLabels).toEqual(["Low", "High"]);
      }

      // Intermediate format item
      expect(sections[1].items[0].kind).toBe("quantitative");

      // Legacy format item
      expect(sections[2].items[0].kind).toBe("quantitative");
    });

    it("returns empty scale when likertDescriptors is missing", () => {
      const structure = [
        {
          key: "s1",
          title: "Section",
          questions: [{ key: "q1", prompt: "Rate.", type: "likert" }],
        },
      ];

      const sections = mapTemplateStructureToSections(structure);
      const item = sections[0].items[0];

      expect(item.kind).toBe("quantitative");
      if (item.kind === "quantitative") {
        expect(item.scale).toEqual([]);
        expect(item.descriptorLabels).toBeUndefined();
      }
    });

    it("omits suggestedResponses when array is empty", () => {
      const structure = [
        {
          key: "s1",
          title: "Section",
          questions: [
            {
              key: "q1",
              prompt: "Feedback",
              type: "guided_open_ended",
              suggestedResponses: [],
            },
          ],
        },
      ];

      const sections = mapTemplateStructureToSections(structure);
      const item = sections[0].items[0];

      expect(item.kind).toBe("qualitative");
      if (item.kind === "qualitative") {
        expect(item.suggestedResponses).toBeUndefined();
      }
    });
  });
});
