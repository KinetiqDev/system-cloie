export type SnapshotItem = {
  kind: "quantitative" | "qualitative";
  key: string;
  prompt: string;
};

export type SnapshotSection = {
  key: string;
  title: string;
  items?: SnapshotItem[];
  questions?: Array<{
    key: string;
    type: string;
    prompt: string;
  }>;
  qualitative_prompts?: Array<{ key: string; prompt: string }>;
  quantitative_items?: Array<{ key: string; prompt: string }>;
};

export function isSnapshotSection(value: unknown): value is SnapshotSection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const section = value as SnapshotSection;
  return typeof section.key === "string" && typeof section.title === "string";
}

/**
 * Whether a frozen item may legitimately stay blank.
 *
 * Submission completeness treats `required: false` as optional and an absent
 * flag as required, in every snapshot format. The legacy split-array formats
 * carry no flag at all, so their items are required by definition.
 */
export type SnapshotItemApplicability = "required" | "optional";

export type SnapshotQuantitativeItem = {
  sectionKey: string;
  sectionTitle: string;
  itemKey: string;
  prompt: string;
  applicability: SnapshotItemApplicability;
};

function quantitativeApplicability(item: { required?: unknown }): SnapshotItemApplicability {
  return item.required === false ? "optional" : "required";
}

/**
 * Enumerate every quantitative item of a frozen instrument structure in
 * snapshot order, across the modern `items`, `questions`, and legacy
 * `quantitative_items` formats. Reporting surfaces use this to list applicable
 * questions — including questions no respondent answered — and to label the
 * columns of a raw-response grid.
 */
export function listSnapshotQuantitativeItems(snapshot: unknown): SnapshotQuantitativeItem[] {
  if (!Array.isArray(snapshot)) {
    return [];
  }

  const items: SnapshotQuantitativeItem[] = [];
  for (const section of snapshot) {
    if (!isSnapshotSection(section)) continue;
    const raw = section as unknown as Record<string, unknown>;
    const collect = (candidates: Array<Record<string, unknown>>) => {
      for (const candidate of candidates) {
        const itemKey = candidate.key;
        if (typeof itemKey !== "string" || itemKey.length === 0) continue;
        items.push({
          sectionKey: section.key,
          sectionTitle: section.title,
          itemKey,
          prompt: typeof candidate.prompt === "string" ? candidate.prompt : itemKey,
          applicability: quantitativeApplicability(candidate),
        });
      }
    };

    if (Array.isArray(raw.items)) {
      collect(
        (raw.items as Array<Record<string, unknown>>).filter((item) => item.kind === "quantitative")
      );
      continue;
    }
    if (Array.isArray(raw.questions)) {
      collect((raw.questions as Array<Record<string, unknown>>).filter((q) => q.type === "likert"));
      continue;
    }
    collect((raw.quantitative_items as Array<Record<string, unknown>> | undefined) ?? []);
  }
  return items;
}

export function getSnapshotSectionItems(section: SnapshotSection): SnapshotItem[] {
  // Modern format: items array with kind
  if (section.items) {
    return section.items;
  }

  // Questions format: questions array with type
  if (section.questions) {
    return section.questions.map((q) => ({
      kind: q.type === "likert" ? "quantitative" : "qualitative",
      key: q.key,
      prompt: q.prompt,
    }));
  }

  // Legacy format: separate arrays
  return [
    ...(section.quantitative_items ?? []).map((item) => ({
      kind: "quantitative" as const,
      key: item.key,
      prompt: item.prompt,
    })),
    ...(section.qualitative_prompts ?? []).map((item) => ({
      kind: "qualitative" as const,
      key: item.key,
      prompt: item.prompt,
    })),
  ];
}
