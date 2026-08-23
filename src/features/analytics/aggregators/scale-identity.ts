import { isSnapshotSection, type SnapshotSection } from "../services/snapshot-structure";

// ---------------------------------------------------------------------------
// Scale descriptors and identities (spec §9)
// ---------------------------------------------------------------------------

/** A Likert descriptor value and optional label from an instrument structure. */
export type ScaleDescriptor = { value: number; label: string | null };

/**
 * One resolved rating scale derived from an instrument version's frozen
 * structure snapshot. Identity includes the minimum value, maximum value,
 * and the label of every rating value; numeric ranges alone never define
 * compatibility. `key` is the canonical identity string: two scales are
 * compatible only when their keys are equal, so incompatible scales never
 * merge into one metric.
 */
export type ScaleIdentity = {
  key: string;
  min: number;
  max: number;
  descriptors: ScaleDescriptor[];
};

/**
 * Canonical identity key of one sorted descriptor set. Equal keys mean equal
 * min/max/per-value labels, so metrics may pool; different keys mean
 * incompatible scales that must stay in separate groups.
 */
function canonicalScaleKey(descriptors: ScaleDescriptor[]): string {
  return JSON.stringify([...descriptors].sort((left, right) => left.value - right.value));
}

/** Resolve one sorted descriptor set into a scale identity; null when empty. */
export function toScaleIdentity(descriptors: ScaleDescriptor[]): ScaleIdentity | null {
  if (descriptors.length === 0) {
    return null;
  }
  const sorted = [...descriptors].sort((left, right) => left.value - right.value);
  return {
    key: canonicalScaleKey(sorted),
    min: sorted[0].value,
    max: sorted[sorted.length - 1].value,
    descriptors: sorted,
  };
}

/** True when a rating value belongs to the resolved scale. */
export function ratingBelongsToScale(scale: ScaleIdentity | null, value: number): boolean {
  return scale !== null && scale.descriptors.some((descriptor) => descriptor.value === value);
}

/**
 * Extract the distinct rating scales from an instrument version's frozen
 * structure snapshot. Supports both the modern `items` format (`scale` value
 * arrays) and the `questions` format (`likertDescriptors` pairs). Identical
 * descriptor sets are deduplicated; qualitative items are ignored.
 */
export function extractDistinctScales(structureSnapshot: unknown): ScaleDescriptor[][] {
  if (!Array.isArray(structureSnapshot)) {
    return [];
  }

  const scales: ScaleDescriptor[][] = [];
  for (const section of structureSnapshot) {
    if (!isSnapshotSection(section)) {
      continue;
    }
    scales.push(...sectionScales(section));
  }

  return dedupeScales(scales);
}

function sectionScales(section: SnapshotSection): ScaleDescriptor[][] {
  const scales: ScaleDescriptor[][] = [];
  for (const candidate of rawSnapshotItems(section)) {
    const kind = candidate.kind ?? candidate.type;
    if (kind !== "quantitative" && kind !== "likert") {
      continue;
    }
    const descriptors = extractDescriptors(candidate);
    if (descriptors.length === 0) {
      continue;
    }
    scales.push([...descriptors].sort((left, right) => left.value - right.value));
  }
  return scales;
}

// Deliberately narrower than rawSectionItemCandidates: distinct-scale
// extraction never reads the legacy quantitative_items format, matching the
// locked behavior this module absorbed from program-head-analytics-aggregators.
function rawSnapshotItems(section: SnapshotSection): Array<Record<string, unknown>> {
  const raw = section as unknown as Record<string, unknown>;
  if (Array.isArray(raw.items)) {
    return raw.items as Array<Record<string, unknown>>;
  }
  if (Array.isArray(raw.questions)) {
    return raw.questions as Array<Record<string, unknown>>;
  }
  return [];
}

function extractDescriptors(candidate: Record<string, unknown>): ScaleDescriptor[] {
  const likert = extractLikertDescriptors(candidate.likertDescriptors);
  if (likert.length > 0) {
    return likert;
  }
  return extractNumericScale(candidate.scale);
}

function extractLikertDescriptors(value: unknown): ScaleDescriptor[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const descriptors: ScaleDescriptor[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const { value: numericValue, label } = entry as { value?: unknown; label?: unknown };
    if (typeof numericValue !== "number") {
      continue;
    }
    descriptors.push({ value: numericValue, label: typeof label === "string" ? label : null });
  }
  return descriptors;
}

function extractNumericScale(value: unknown): ScaleDescriptor[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const values = value.filter((entry): entry is number => typeof entry === "number");
  return values.map((entry) => ({ value: entry, label: null }));
}

/**
 * Canonical, sorted scale identity strings used for comparability
 * fingerprinting. Distinct strings mark incompatible scale sets.
 */
export function buildScaleIdentities(scales: ScaleDescriptor[][]): string[] {
  return dedupeScales(scales)
    .map((scale) => JSON.stringify(scale))
    .sort();
}

function dedupeScales(scales: ScaleDescriptor[][]): ScaleDescriptor[][] {
  const unique = new Map<string, ScaleDescriptor[]>();
  for (const scale of scales) {
    unique.set(JSON.stringify(scale), scale);
  }
  return [...unique.values()];
}

/** Readable scale summary, e.g. "1–5 (5-point)". */
export function describeScale(descriptors: ScaleDescriptor[]): string {
  const values = descriptors.map((descriptor) => descriptor.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const consecutive = values.every((value, index) => value === min + index);
  return consecutive
    ? `${min}–${max} (${values.length}-point)`
    : `${values.length}-point (${values.join(", ")})`;
}

/** Readable scale context for a period; null when no quantitative evidence exists. */
export function describeScales(scales: ScaleDescriptor[][]): string | null {
  const descriptions = dedupeScales(scales).map(describeScale);
  return descriptions.length > 0 ? descriptions.sort().join(", ") : null;
}
function rawSectionItemCandidates(section: SnapshotSection): Array<Record<string, unknown>> {
  const raw = section as unknown as Record<string, unknown>;
  if (Array.isArray(raw.items)) {
    return raw.items as Array<Record<string, unknown>>;
  }
  if (Array.isArray(raw.questions)) {
    return raw.questions as Array<Record<string, unknown>>;
  }
  if (Array.isArray(raw.quantitative_items)) {
    return raw.quantitative_items as Array<Record<string, unknown>>;
  }
  return [];
}

/**
 * Resolve the Likert scale for one rating item from the instrument version's
 * frozen structure snapshot. The item is located by its canonical section and
 * item keys across the modern `items`, `questions`, and legacy
 * `quantitative_items` snapshot formats; category values and labels come from
 * the snapshot rather than a universal 1–5 assumption. Returns null when the
 * item (or its scale) cannot be resolved.
 */
export function resolveSnapshotItemScale(
  structureSnapshot: unknown,
  sectionKey: string,
  itemKey: string
): ScaleDescriptor[] | null {
  if (!Array.isArray(structureSnapshot)) {
    return null;
  }

  for (const section of structureSnapshot) {
    if (!isSnapshotSection(section) || section.key !== sectionKey) {
      continue;
    }
    const candidate = rawSectionItemCandidates(section).find((entry) => entry.key === itemKey);
    if (!candidate) {
      continue;
    }
    const descriptors = extractDescriptors(candidate);
    if (descriptors.length === 0) {
      return null;
    }
    return [...descriptors].sort((left, right) => left.value - right.value);
  }

  return null;
}

/**
 * Resolve the full scale identity (min, max, per-value labels) of one rating
 * item from the frozen structure snapshot; null when unresolvable. This is
 * the §9 contract every shared metric uses to group or separate evidence.
 */
export function resolveItemScaleIdentity(
  structureSnapshot: unknown,
  sectionKey: string,
  itemKey: string
): ScaleIdentity | null {
  const descriptors = resolveSnapshotItemScale(structureSnapshot, sectionKey, itemKey);
  return descriptors ? toScaleIdentity(descriptors) : null;
}
