import { mapTemplateStructureToSections } from "@/features/responses/services/map-template-structure";
import type { LikertDescriptor, QuestionType } from "../types";

type PublishedInstrumentQuestion = {
  key: string;
  prompt: string;
  type: QuestionType;
  order: number;
  required: boolean;
  likertDescriptors: LikertDescriptor[];
  suggestedResponses: string[];
};

type PublishedInstrumentSection = {
  key: string;
  title: string;
  description: string | null;
  order: number;
  questions: PublishedInstrumentQuestion[];
};

function descriptorsFromScale(scale: number[], labels?: string[]): LikertDescriptor[] {
  return scale.map((value, index) => ({
    value,
    label: labels?.[index] ?? String(value),
  }));
}

export function parsePublishedInstrument(snapshot: unknown): PublishedInstrumentSection[] {
  return mapTemplateStructureToSections(snapshot).map((section, sectionIndex) => ({
    key: section.id,
    title: section.name,
    description: section.description || null,
    order: sectionIndex,
    questions: section.items.map((item, itemIndex) => {
      if (item.kind === "quantitative") {
        return {
          key: item.itemKey,
          prompt: item.prompt,
          type: "likert" as const,
          order: itemIndex,
          required: item.required !== false,
          likertDescriptors: descriptorsFromScale(item.scale, item.descriptorLabels),
          suggestedResponses: [],
        };
      }

      return {
        key: item.promptKey,
        prompt: item.prompt,
        type: "guided_open_ended" as const,
        order: itemIndex,
        required: item.required !== false,
        likertDescriptors: [],
        suggestedResponses: item.suggestedResponses ?? [],
      };
    }),
  }));
}
