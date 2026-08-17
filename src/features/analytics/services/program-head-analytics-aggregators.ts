import { isSnapshotSection, type SnapshotSection } from "./snapshot-structure";
import type {
  ProgramHeadOverviewKPI,
  ProgramHeadTrendBreakDTO,
  ProgramHeadTrendPeriodDTO,
  ProgramHeadTrendsEmptyReason,
} from "../program-head-analytics-types";

// ---------------------------------------------------------------------------
// Scale identity
// ---------------------------------------------------------------------------

/** A Likert descriptor value and optional label from an instrument structure. */
export type ScaleDescriptor = { value: number; label: string | null };

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

/** Canonical, sorted scale identities used for comparability fingerprinting. */
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

// ---------------------------------------------------------------------------
// Comparability fingerprint
// ---------------------------------------------------------------------------

/**
 * Identity of a period's evidence for trend comparability. Two periods are
 * comparable only when every dimension matches: the immutable instrument
 * version IDs that produced the ratings (display labels can collide across
 * templates), the Likert scale identities, and the mapped Graduate Outcome
 * codes. All arrays are sorted so equality is order-independent.
 */
export type TrendComparabilityFingerprint = {
  instrumentVersions: string[];
  scaleIdentities: string[];
  outcomeCodes: string[];
};

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function fingerprintsEqual(
  left: TrendComparabilityFingerprint,
  right: TrendComparabilityFingerprint
): boolean {
  return (
    arraysEqual(left.instrumentVersions, right.instrumentVersions) &&
    arraysEqual(left.scaleIdentities, right.scaleIdentities) &&
    arraysEqual(left.outcomeCodes, right.outcomeCodes)
  );
}

/** Human-readable reasons why two fingerprints are not comparable. */
function describeFingerprintChange(
  previous: TrendComparabilityFingerprint,
  current: TrendComparabilityFingerprint
): string[] {
  const reasons: string[] = [];
  if (!arraysEqual(previous.instrumentVersions, current.instrumentVersions)) {
    reasons.push("The instrument version changed between these periods.");
  }
  if (!arraysEqual(previous.scaleIdentities, current.scaleIdentities)) {
    reasons.push("The rating scale identity changed between these periods.");
  }
  if (!arraysEqual(previous.outcomeCodes, current.outcomeCodes)) {
    reasons.push("The mapped outcomes changed between these periods.");
  }
  return reasons;
}

// ---------------------------------------------------------------------------
// Period series
// ---------------------------------------------------------------------------

const SEMESTER_ORDER: Record<string, number> = { FIRST: 0, SECOND: 1, SUMMER: 2 };
const TERM_ORDER: Record<string, number> = { FIRST_TERM: 0, SECOND_TERM: 1 };

/** Canonical semester order for chronological period sorting. */
export function semesterOrder(semester: string): number {
  return SEMESTER_ORDER[semester] ?? 99;
}

/** Canonical term order for chronological period sorting; null sorts first. */
export function termOrder(term: string | null): number {
  return term ? TERM_ORDER[term] ?? 99 : -1;
}

/** Per-period evidence assembled by the trends read before series resolution. */
export type TrendSeriesPeriodInput = {
  termInstanceId: string;
  periodLabel: string;
  /** Chronological sort key: school year code, semester order, term order. */
  sortKey: readonly [string, number, number];
  meanRating: number | null;
  submittedResponseCount: number;
  ratingCount: number;
  instrumentContext: string | null;
  scaleContext: string | null;
  outcomeCodes: string[];
  fingerprint: TrendComparabilityFingerprint;
};

function comparePeriods(
  left: TrendSeriesPeriodInput,
  right: TrendSeriesPeriodInput
): number {
  const [leftYear, leftSemester, leftTerm] = left.sortKey;
  const [rightYear, rightSemester, rightTerm] = right.sortKey;
  return (
    leftYear.localeCompare(rightYear) ||
    leftSemester - rightSemester ||
    leftTerm - rightTerm ||
    left.termInstanceId.localeCompare(right.termInstanceId)
  );
}

/** One drawable point in a comparable run. */
type TrendRunPoint = { periodLabel: string; meanRating: number };

/**
 * Split chronological periods into maximal runs of consecutive comparable
 * periods that can be joined by a line. An unrated period never bridges two
 * points, so unlike or unrated periods are never interpolated.
 */
export function splitComparableRuns(
  periods: Array<
    Pick<ProgramHeadTrendPeriodDTO, "periodLabel" | "meanRating" | "comparableWithPrevious">
  >
): TrendRunPoint[][] {
  const runs: TrendRunPoint[][] = [];
  let current: TrendRunPoint[] | null = null;

  for (const period of periods) {
    if (period.meanRating === null) {
      current = null;
      continue;
    }
    if (!current || !period.comparableWithPrevious) {
      current = [];
      runs.push(current);
    }
    current.push({ periodLabel: period.periodLabel, meanRating: period.meanRating });
  }

  return runs;
}

function canDrawTrendLine(periods: ProgramHeadTrendPeriodDTO[]): boolean {
  return splitComparableRuns(periods).some((run) => run.length >= 2);
}

/**
 * Sort evidence periods chronologically and resolve comparability flags,
 * breaks, and the empty reason. Two periods are comparable only when both are
 * rated and share the same instrument version, scale identity, and mapped
 * outcome identity. Unrated transitions never join a run and never fabricate
 * a break reason.
 */
export function buildTrendSeries(inputs: TrendSeriesPeriodInput[]): {
  periods: ProgramHeadTrendPeriodDTO[];
  breaks: ProgramHeadTrendBreakDTO[];
  emptyReason: ProgramHeadTrendsEmptyReason;
} {
  const sorted = [...inputs].sort(comparePeriods);

  const periods: ProgramHeadTrendPeriodDTO[] = sorted.map((input, index) => {
    const previous = sorted[index - 1];
    return {
      termInstanceId: input.termInstanceId,
      periodLabel: input.periodLabel,
      meanRating: input.meanRating,
      submittedResponseCount: input.submittedResponseCount,
      ratingCount: input.ratingCount,
      instrumentContext: input.instrumentContext,
      scaleContext: input.scaleContext,
      outcomeCodes: [...input.outcomeCodes].sort(),
      comparableWithPrevious:
        previous !== undefined &&
        previous.meanRating !== null &&
        input.meanRating !== null &&
        fingerprintsEqual(previous.fingerprint, input.fingerprint),
    };
  });

  const breaks: ProgramHeadTrendBreakDTO[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (previous.meanRating === null || current.meanRating === null) {
      continue;
    }
    if (fingerprintsEqual(previous.fingerprint, current.fingerprint)) {
      continue;
    }
    breaks.push({
      fromPeriodLabel: previous.periodLabel,
      toPeriodLabel: current.periodLabel,
      reason: describeFingerprintChange(previous.fingerprint, current.fingerprint).join(" "),
    });
  }

  const emptyReason: ProgramHeadTrendsEmptyReason =
    sorted.length === 0
      ? "no-evidence"
      : canDrawTrendLine(periods)
        ? null
        : "no-comparable-history";

  return { periods, breaks, emptyReason };
}

// ---------------------------------------------------------------------------
// Shared Overview KPI (shipped by #432 for the compact dashboard)
// ---------------------------------------------------------------------------

/**
 * Build the shared Overview KPI projection used by both the selected-Program
 * Analytics Overview and the compact Program Head dashboard.
 *
 * Semantics locked by #430 and reused by the dashboard:
 * - `submittedResponseCount`: responses with `status = SUBMITTED` only.
 * - `evaluationOpportunityCount`: all in-scope `EvaluationAssignment` rows
 *   (the historical response-rate denominator).
 * - `responseRate`: submitted responses divided by eligible opportunities;
 *   `null` when there are no opportunities (never a fabricated 0%).
 * - `ratingCount`: valid quantitative items, distinct from response count.
 * - `meanRating`: sum of valid rating values divided by rating count,
 *   retained at full precision; `null` when there are no ratings.
 *
 * Pure aggregation helper: no Prisma access, so the deterministic formulas
 * stay unit-testable and identical across surfaces.
 */
export function buildProgramHeadOverviewKpi(input: {
  submittedResponseCount: number;
  evaluationOpportunityCount: number;
  ratingCount: number;
  ratingSum: number;
}): ProgramHeadOverviewKPI {
  const { submittedResponseCount, evaluationOpportunityCount, ratingCount, ratingSum } = input;

  return {
    submittedResponseCount,
    evaluationOpportunityCount,
    responseRate:
      evaluationOpportunityCount === 0
        ? null
        : submittedResponseCount / evaluationOpportunityCount,
    ratingCount,
    meanRating: ratingCount === 0 ? null : ratingSum / ratingCount,
  };
}
