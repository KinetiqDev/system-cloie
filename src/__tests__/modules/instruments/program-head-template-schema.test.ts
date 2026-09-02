import { describe, expect, test } from "vitest";
import {
  createProgramHeadTemplateSchema,
  templateQuestionSchema,
} from "@/features/instruments/schemas/program-head-template";

describe("program-head-template schema", () => {
  test("rejects duplicate suggested responses after trimming", () => {
    const result = templateQuestionSchema.safeParse({
      key: "question-1",
      prompt: "Suggestions",
      type: "guided_open_ended",
      order: 0,
      required: true,
      suggestedResponses: ["Alpha", "Alpha ", "Beta"],
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues[0]?.message).toBe(
      "Predefined responses must be unique within a question."
    );
  });

  test("accepts unique suggested responses in a template payload", () => {
    const result = createProgramHeadTemplateSchema.safeParse({
      programId: "00000000-0000-4000-8000-000000000001",
      name: "Graduate Exit Tool",
      description: "",
      template_type: "PROGRAM_WIDE",
      is_faculty_accessible: false,
      structure: [
        {
          key: "section-1",
          title: "Feedback",
          description: "",
          order: 0,
          questions: [
            {
              key: "question-1",
              prompt: "Suggestions",
              type: "guided_open_ended",
              order: 0,
              required: true,
              suggestedResponses: ["Alpha", "Beta"],
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  test("parses an explicit inactive template state", () => {
    const result = createProgramHeadTemplateSchema.safeParse({
      programId: "00000000-0000-4000-8000-000000000001",
      name: "Inactive Tool",
      is_active: "false",
      template_type: "PROGRAM_WIDE",
      is_faculty_accessible: false,
      structure: [
        {
          key: "section-1",
          title: "Feedback",
          order: 0,
          questions: [
            {
              key: "question-1",
              prompt: "Suggestions",
              type: "guided_open_ended",
              order: 0,
              required: true,
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.is_active).toBe(false);
  });
});
