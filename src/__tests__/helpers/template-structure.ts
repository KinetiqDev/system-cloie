import type { TemplateStructure } from "@/features/instruments/types";

/**
 * Two sections stored in reverse of their titles' alphabetical order. Suites
 * assert against this fixture to prove a save persists the author's section
 * order instead of re-deriving one.
 */
export const REORDERED_STRUCTURE: TemplateStructure = [
  {
    key: "section-b",
    title: "Section B",
    description: undefined,
    order: 0,
    questions: [
      {
        key: "question-b",
        prompt: "Question B",
        type: "likert",
        order: 0,
        required: true,
      },
    ],
  },
  {
    key: "section-a",
    title: "Section A",
    description: undefined,
    order: 1,
    questions: [
      {
        key: "question-a",
        prompt: "Question A",
        type: "likert",
        order: 0,
        required: true,
      },
    ],
  },
];
