import type {
  StudentEvaluationSection,
  StudentEvaluationSession,
} from "@/features/responses/types";
import { mapSavedAnswerItems } from "./map-saved-answer-items";
import { mapTemplateStructureToSections } from "./map-template-structure";

type ResponseWithItems = {
  id: string;
  submitted_at: Date | null;
  qual_items: Array<{ prompt_key: string; section_key: string; text_content: string }>;
  quant_items: Array<{ item_key: string; rating_value: number; section_key: string }>;
};

/** Stand-in first section for list cards whose frozen structure has no sections. */
export function buildFallbackSection(): StudentEvaluationSection {
  return {
    description: "",
    id: "overview",
    items: [],
    name: "Overview",
  };
}

/** Progress counters for one assignment: every Course-bound and Central reader derives them here. */
export function buildEvaluationSession(
  sections: StudentEvaluationSection[],
  response: ResponseWithItems | null
): StudentEvaluationSession {
  return {
    answeredItems: response ? response.qual_items.length + response.quant_items.length : 0,
    responseId: response?.id ?? null,
    submittedAt: response?.submitted_at ?? null,
    totalItems: sections.reduce((total, section) => total + section.items.length, 0),
  };
}

/**
 * Prepared wizard session for one assignment: the frozen structure mapped to
 * sections, the saved answers keyed for the browser, and the progress session.
 */
export function prepareEvaluationSession(
  structureSnapshot: unknown,
  response: ResponseWithItems | null
): {
  sections: StudentEvaluationSection[];
  savedAnswers: Record<string, number | string>;
  session: StudentEvaluationSession;
} {
  const sections = mapTemplateStructureToSections(structureSnapshot);

  return {
    sections,
    savedAnswers: response
      ? mapSavedAnswerItems({
          qualitativeItems: response.qual_items,
          quantitativeItems: response.quant_items,
        })
      : {},
    session: buildEvaluationSession(sections, response),
  };
}
