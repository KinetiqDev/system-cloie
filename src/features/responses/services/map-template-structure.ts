import type { StudentEvaluationSection } from "@/features/responses/types";

// ─── Internal type guards & shapes ──────────────────────────────────────────

/** Legacy format: separate `quantitative_items` + `qualitative_prompts` arrays */
type LegacySection = {
  key: string;
  title: string;
  description?: string;
  quantitative_items?: Array<{
    key: string;
    prompt: string;
    scale?: number[];
  }>;
  qualitative_prompts?: Array<{
    key: string;
    prompt: string;
  }>;
};

/** Intermediate format: unified `items` array with `kind` discriminator */
type IntermediateSection = {
  key: string;
  title: string;
  description?: string;
  items: Array<{
    kind: "quantitative" | "qualitative";
    key: string;
    prompt: string;
    scale?: number[];
  }>;
};

/** New Phase 3 format: `questions` array with `type` discriminator */
type NewFormatSection = {
  key: string;
  title: string;
  description?: string;
  questions: Array<{
    key: string;
    prompt: string;
    type: "likert" | "guided_open_ended";
    order?: number;
    required?: boolean;
    likertDescriptors?: Array<{ value: number; label: string }>;
    suggestedResponses?: string[];
  }>;
};

function isValidSection(value: unknown): value is { key: string; title: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const section = value as Record<string, unknown>;
  return typeof section.key === "string" && typeof section.title === "string";
}

function hasQuestionsArray(
  section: Record<string, unknown>
): section is Record<string, unknown> & { questions: unknown[] } {
  return Array.isArray(section.questions);
}

function hasItemsArray(
  section: Record<string, unknown>
): section is Record<string, unknown> & { items: unknown[] } {
  return Array.isArray(section.items);
}

// ─── Section mappers ────────────────────────────────────────────────────────

function mapNewFormatSection(section: NewFormatSection): StudentEvaluationSection {
  const sortedQuestions = [...section.questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return {
    id: section.key,
    name: section.title,
    description: section.description ?? "",
    items: sortedQuestions.map((q) => {
      if (q.type === "likert") {
        const descriptors = q.likertDescriptors ?? [];
        return {
          kind: "quantitative" as const,
          itemKey: q.key,
          prompt: q.prompt,
          scale: descriptors.map((d) => d.value),
          descriptorLabels: descriptors.length > 0 ? descriptors.map((d) => d.label) : undefined,
          required: q.required,
        };
      }
      // guided_open_ended → qualitative
      return {
        kind: "qualitative" as const,
        promptKey: q.key,
        prompt: q.prompt,
        suggestedResponses:
          q.suggestedResponses && q.suggestedResponses.length > 0
            ? q.suggestedResponses
            : undefined,
        required: q.required,
      };
    }),
  };
}

function mapIntermediateSection(section: IntermediateSection): StudentEvaluationSection {
  return {
    id: section.key,
    name: section.title,
    description: section.description ?? "",
    items: (section.items ?? []).map((item) => {
      if (item.kind === "quantitative") {
        return {
          kind: "quantitative" as const,
          itemKey: item.key,
          prompt: item.prompt,
          scale: item.scale ?? [],
        };
      }
      return {
        kind: "qualitative" as const,
        promptKey: item.key,
        prompt: item.prompt,
      };
    }),
  };
}

function mapLegacySection(section: LegacySection): StudentEvaluationSection {
  return {
    id: section.key,
    name: section.title,
    description: section.description ?? "",
    items: [
      ...(section.quantitative_items ?? []).map((item) => ({
        kind: "quantitative" as const,
        itemKey: item.key,
        prompt: item.prompt,
        scale: item.scale ?? [],
      })),
      ...(section.qualitative_prompts ?? []).map((item) => ({
        kind: "qualitative" as const,
        promptKey: item.key,
        prompt: item.prompt,
      })),
    ],
  };
}

// ─── Universal mapper ───────────────────────────────────────────────────────

/**
 * Universal structure mapper that handles all template structure formats:
 *
 * 1. **New format** (Phase 3): sections with `questions[]` containing
 *    `type: "likert" | "guided_open_ended"`, `likertDescriptors`, `suggestedResponses`
 * 2. **Intermediate format**: sections with `items[]` containing
 *    `kind: "quantitative" | "qualitative"`
 * 3. **Legacy format**: sections with separate `quantitative_items[]` and
 *    `qualitative_prompts[]` arrays
 *
 * Detection priority: `questions` → `items` → legacy arrays → empty section.
 */
export function mapTemplateStructureToSections(structure: unknown): StudentEvaluationSection[] {
  if (!Array.isArray(structure)) {
    return [];
  }

  return structure.filter(isValidSection).map((rawSection) => {
    const section = rawSection as Record<string, unknown>;

    // New format: has `questions` array
    if (hasQuestionsArray(section)) {
      return mapNewFormatSection(section as unknown as NewFormatSection);
    }

    // Intermediate format: has `items` array
    if (hasItemsArray(section)) {
      return mapIntermediateSection(section as unknown as IntermediateSection);
    }

    // Legacy format: has `quantitative_items` and/or `qualitative_prompts`
    return mapLegacySection(section as unknown as LegacySection);
  });
}
