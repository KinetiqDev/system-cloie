import {
  describeScale,
  resolveSnapshotItemScale,
  type ScaleDescriptor,
} from "../aggregators/scale-identity";
import {
  encodeContributionKey,
  encodeDirectContributorKey,
} from "../aggregators/question-identity";
import type { TargetStakeholder, YearLevel } from "@prisma/client";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import type {
  ProgramHeadBreakdownRowDTO,
  ProgramHeadCourseBreakdownRowDTO,
  ProgramHeadInstrumentBreakdownRowDTO,
  ProgramHeadInstrumentSourceDTO,
  ProgramHeadOutcomeCategoryDTO,
  ProgramHeadOutcomeDTO,
  ProgramHeadOutcomeScaleDistributionDTO,
  ProgramHeadOverviewKPI,
  ProgramHeadStakeholderBucketDTO,
  ProgramHeadStakeholderSourceKey,
  ProgramHeadTrendBreakDTO,
  ProgramHeadTrendPeriodDTO,
  ProgramHeadTrendsEmptyReason,
} from "../program-head-analytics-types";

// ---------------------------------------------------------------------------
// Comparability fingerprint
// ---------------------------------------------------------------------------

/**
 * Identity of a period's evidence for trend comparability. Two periods are
 * comparable only when every dimension matches: immutable instrument version
 * IDs, the source-to-instrument relation and normalized response share, Likert
 * scale identities, mapped Graduate Outcome codes, and normalized
 * source composition. The relation prevents two sources exchanging instrument
 * versions from appearing comparable merely because the unordered source and
 * instrument sets still match. All arrays are sorted for order-independent
 * equality.
 */
export type TrendComparabilityFingerprint = {
  instrumentVersions: string[];
  scaleIdentities: string[];
  outcomeCodes: string[];
  sourceComposition: string[];
  sourceInstrumentComposition: string[];
};
function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Normalized per-source mix of distinct rating-bearing responses for one
 * period, e.g. `["CENTRAL:0.38", "COURSE_BOUND:0.62"]`. Shares round to the
 * nearest percent so trivial count jitter does not break comparability, while
 * a materially shifted mix does. Sorted for order-independent equality.
 */
export function buildSourceComposition(counts: ReadonlyMap<string, number>): string[] {
  let total = 0;
  for (const count of counts.values()) total += count;
  if (total === 0) return [];
  const entries: string[] = [];
  for (const [source, count] of counts) {
    entries.push(`${source}:${(Math.round((count / total) * 100) / 100).toFixed(2)}`);
  }
  return entries.sort();
}
export function fingerprintsEqual(
  left: TrendComparabilityFingerprint,
  right: TrendComparabilityFingerprint
): boolean {
  return (
    arraysEqual(left.instrumentVersions, right.instrumentVersions) &&
    arraysEqual(left.scaleIdentities, right.scaleIdentities) &&
    arraysEqual(left.outcomeCodes, right.outcomeCodes) &&
    arraysEqual(left.sourceComposition, right.sourceComposition) &&
    arraysEqual(left.sourceInstrumentComposition, right.sourceInstrumentComposition)
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
  if (!arraysEqual(previous.sourceComposition, current.sourceComposition)) {
    reasons.push("The response source composition changed between these periods.");
  }
  if (!arraysEqual(previous.sourceInstrumentComposition, current.sourceInstrumentComposition)) {
    reasons.push("The source-to-instrument evidence composition changed between these periods.");
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
  return term ? (TERM_ORDER[term] ?? 99) : -1;
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

function comparePeriods(left: TrendSeriesPeriodInput, right: TrendSeriesPeriodInput): number {
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
      evaluationOpportunityCount === 0 ? null : submittedResponseCount / evaluationOpportunityCount,
    ratingCount,
    meanRating: ratingCount === 0 ? null : ratingSum / ratingCount,
  };
}

// ---------------------------------------------------------------------------
// Program GO outcome evidence
// ---------------------------------------------------------------------------

/** One normalized course-bound rating row ready for Program GO aggregation. */
export type OutcomeEvidenceRow = {
  ratingValue: number;
  responseId: string;
  sectionKey: string;
  itemKey: string;
  /** Frozen structure snapshot of the instrument version that produced the rating. */
  instrumentVersion: { id: string; structureSnapshot: unknown } | null;
  course: { id: string; code: string; title: string } | null;
  /** CILO provenance for current CILO-to-GO mappings, when present. */
  cilo: {
    id: string;
    code: string;
    description: string;
    course: { id: string; code: string; title: string } | null;
  } | null;
  /** Current CILO-to-GO mappings for the selected Program only. */
  goMappings: Array<{
    goId: string;
    code: string;
    name: string;
    manifestation: "LEARNING" | "PRACTICE" | "OPPORTUNITY" | null;
  }>;
  /** Frozen direct question-to-GO bindings published with the evaluation. */
  directGoBindings: Array<{
    goId: string;
    code: string;
    name: string;
    questionPrompt: string;
  }>;
  evaluationId: string;
  deploymentName: string;
};

type CiloContributorAggregate = {
  kind: "CILO";
  ciloId: string;
  ciloCode: string;
  ciloDescription: string;
  course: { id: string; code: string; title: string } | null;
  manifestation: "LEARNING" | "PRACTICE" | "OPPORTUNITY" | null;
  ratingSum: number;
  ratingCount: number;
};

type DirectGoContributorAggregate = {
  kind: "DIRECT_GO";
  evaluationId: string;
  deploymentName: string;
  sectionKey: string;
  itemKey: string;
  questionPrompt: string;
  course: { id: string; code: string; title: string } | null;
  ratingSum: number;
  ratingCount: number;
};

/** Accumulated evidence behind one Graduate Outcome row. */
type OutcomeEvidenceAggregate = {
  goId: string;
  code: string;
  name: string;
  ratingSum: number;
  ratingCount: number;
  responseIds: Set<string>;
  cilos: Map<string, string>;
  courses: Map<string, { code: string; title: string }>;
  evaluations: Map<string, string>;
  contributors: Map<string, CiloContributorAggregate | DirectGoContributorAggregate>;
  /** scaleKey (sorted descriptor JSON) -> per-category counts */
  distributions: Map<string, { descriptors: ScaleDescriptor[]; counts: Map<number, number> }>;
  excludedRatingCount: number;
};

type OutcomeEvidenceAggregation = {
  /** Aggregates keyed by GO id. */
  outcomes: Map<string, OutcomeEvidenceAggregate>;
  /** True when any contributing CILO maps to more than one selected-Program GO. */
  hasMultiMappedCilo: boolean;
};

type OutcomeGoBinding =
  | OutcomeEvidenceRow["goMappings"][number]
  | OutcomeEvidenceRow["directGoBindings"][number];

function getOrCreateOutcomeAggregate(
  outcomes: Map<string, OutcomeEvidenceAggregate>,
  mapping: OutcomeGoBinding
): OutcomeEvidenceAggregate {
  let aggregate = outcomes.get(mapping.goId);
  if (!aggregate) {
    aggregate = {
      goId: mapping.goId,
      code: mapping.code,
      name: mapping.name,
      ratingSum: 0,
      ratingCount: 0,
      responseIds: new Set(),
      cilos: new Map(),
      courses: new Map(),
      evaluations: new Map(),
      contributors: new Map(),
      distributions: new Map(),
      excludedRatingCount: 0,
    };
    outcomes.set(mapping.goId, aggregate);
  }
  return aggregate;
}

/** Resolve the frozen scale for one rating row; null when unresolvable. */
function resolveRatingScale(row: OutcomeEvidenceRow): ScaleDescriptor[] | null {
  return row.instrumentVersion
    ? resolveSnapshotItemScale(row.instrumentVersion.structureSnapshot, row.sectionKey, row.itemKey)
    : null;
}

/** A rating is valid only when its value belongs to the item's frozen scale. */
function ratingIsValid(descriptors: ScaleDescriptor[] | null, value: number): boolean {
  return descriptors !== null && descriptors.some((descriptor) => descriptor.value === value);
}

function accumulateOutcomeValue(
  aggregate: OutcomeEvidenceAggregate,
  row: OutcomeEvidenceRow,
  descriptors: ScaleDescriptor[] | null,
  isValidRating: boolean
): boolean {
  if (row.course) {
    aggregate.courses.set(row.course.id, { code: row.course.code, title: row.course.title });
  }
  aggregate.evaluations.set(row.evaluationId, row.deploymentName);
  if (!isValidRating) {
    aggregate.excludedRatingCount += 1;
    return false;
  }
  aggregate.ratingSum += row.ratingValue;
  aggregate.ratingCount += 1;
  aggregate.responseIds.add(row.responseId);
  if (descriptors) {
    const scaleKey = JSON.stringify(descriptors);
    let distribution = aggregate.distributions.get(scaleKey);
    if (!distribution) {
      distribution = { descriptors, counts: new Map() };
      aggregate.distributions.set(scaleKey, distribution);
    }
    distribution.counts.set(row.ratingValue, (distribution.counts.get(row.ratingValue) ?? 0) + 1);
  }
  return true;
}

function accumulateCiloContributor(
  aggregate: OutcomeEvidenceAggregate,
  row: OutcomeEvidenceRow,
  cilo: NonNullable<OutcomeEvidenceRow["cilo"]>,
  manifestation: "LEARNING" | "PRACTICE" | "OPPORTUNITY" | null
): void {
  aggregate.cilos.set(cilo.id, cilo.description);
  const key = `cilo:${cilo.id}`;
  let contributor = aggregate.contributors.get(key) as CiloContributorAggregate | undefined;
  if (!contributor) {
    contributor = {
      kind: "CILO",
      ciloId: cilo.id,
      ciloCode: cilo.code,
      ciloDescription: cilo.description,
      course: cilo.course,
      manifestation,
      ratingSum: 0,
      ratingCount: 0,
    };
    aggregate.contributors.set(key, contributor);
  }
  contributor.ratingSum += row.ratingValue;
  contributor.ratingCount += 1;
}

function accumulateDirectContributor(
  aggregate: OutcomeEvidenceAggregate,
  row: OutcomeEvidenceRow,
  binding: OutcomeEvidenceRow["directGoBindings"][number]
): void {
  const key = encodeDirectContributorKey(row.evaluationId, row.sectionKey, row.itemKey);
  let contributor = aggregate.contributors.get(key) as DirectGoContributorAggregate | undefined;
  if (!contributor) {
    contributor = {
      kind: "DIRECT_GO",
      evaluationId: row.evaluationId,
      deploymentName: row.deploymentName,
      sectionKey: row.sectionKey,
      itemKey: row.itemKey,
      questionPrompt: binding.questionPrompt,
      course: row.course,
      ratingSum: 0,
      ratingCount: 0,
    };
    aggregate.contributors.set(key, contributor);
  }
  contributor.ratingSum += row.ratingValue;
  contributor.ratingCount += 1;
}

/**
 * Aggregate course-bound ratings into Program GO rows through current CILO
 * mappings and frozen direct question bindings. One response item contributes
 * once per GO even when both paths name the same GO.
 */
/** Accumulate one rating row's CILO-derived contributions. */
function accumulateCiloRowContributions(
  outcomes: Map<string, OutcomeEvidenceAggregate>,
  seenContributions: Set<string>,
  row: OutcomeEvidenceRow,
  descriptors: ScaleDescriptor[] | null,
  isValidRating: boolean
): void {
  if (!row.cilo) return;
  for (const mapping of row.goMappings) {
    const contributionKey = encodeContributionKey(
      row.responseId,
      row.evaluationId,
      row.sectionKey,
      row.itemKey,
      mapping.goId
    );
    if (seenContributions.has(contributionKey)) continue;
    seenContributions.add(contributionKey);
    const aggregate = getOrCreateOutcomeAggregate(outcomes, mapping);
    if (accumulateOutcomeValue(aggregate, row, descriptors, isValidRating)) {
      accumulateCiloContributor(aggregate, row, row.cilo, mapping.manifestation);
    }
  }
}

/** Accumulate one rating row's frozen direct-question contributions. */
function accumulateDirectRowContributions(
  outcomes: Map<string, OutcomeEvidenceAggregate>,
  seenContributions: Set<string>,
  row: OutcomeEvidenceRow,
  descriptors: ScaleDescriptor[] | null,
  isValidRating: boolean
): void {
  for (const binding of row.directGoBindings) {
    const contributionKey = encodeContributionKey(
      row.responseId,
      row.evaluationId,
      row.sectionKey,
      row.itemKey,
      binding.goId
    );
    if (seenContributions.has(contributionKey)) continue;
    seenContributions.add(contributionKey);
    const aggregate = getOrCreateOutcomeAggregate(outcomes, binding);
    if (accumulateOutcomeValue(aggregate, row, descriptors, isValidRating)) {
      accumulateDirectContributor(aggregate, row, binding);
    }
  }
}

/** Accumulate one outcome rating row across both CILO and direct GO paths. */
function accumulateOutcomeEvidenceRow(
  outcomes: Map<string, OutcomeEvidenceAggregate>,
  seenContributions: Set<string>,
  row: OutcomeEvidenceRow
): void {
  const descriptors = resolveRatingScale(row);
  const isValidRating = ratingIsValid(descriptors, row.ratingValue);
  accumulateCiloRowContributions(outcomes, seenContributions, row, descriptors, isValidRating);
  accumulateDirectRowContributions(outcomes, seenContributions, row, descriptors, isValidRating);
}

export function aggregateOutcomeEvidence(rows: OutcomeEvidenceRow[]): OutcomeEvidenceAggregation {
  const outcomes = new Map<string, OutcomeEvidenceAggregate>();
  const seenContributions = new Set<string>();
  let hasMultiMappedCilo = false;

  for (const row of rows) {
    if (row.cilo && row.goMappings.length > 1) {
      hasMultiMappedCilo = true;
    }
    accumulateOutcomeEvidenceRow(outcomes, seenContributions, row);
  }

  return { outcomes, hasMultiMappedCilo };
}

/**
 * Convert GO evidence aggregates into ranked, closed DTO rows. Rows rank by
 * mean rating descending (stronger evidence first), then GO code for stable
 * ordering. Distribution percentages are computed at full precision and
 * rounded only for display.
 */
/** Project one accumulated contributor into its DTO shape. */
function contributorDtoFor(
  contributor: CiloContributorAggregate | DirectGoContributorAggregate
): ProgramHeadOutcomeDTO["contributors"][number] {
  const meanRating = contributor.ratingSum / contributor.ratingCount;
  const ratingCount = contributor.ratingCount;
  return contributor.kind === "CILO"
    ? {
        kind: "CILO" as const,
        ciloId: contributor.ciloId,
        ciloCode: contributor.ciloCode,
        ciloDescription: contributor.ciloDescription,
        course: contributor.course,
        manifestation: contributor.manifestation,
        meanRating,
        ratingCount,
      }
    : {
        kind: "DIRECT_GO" as const,
        evaluationId: contributor.evaluationId,
        deploymentName: contributor.deploymentName,
        sectionKey: contributor.sectionKey,
        itemKey: contributor.itemKey,
        questionPrompt: contributor.questionPrompt,
        course: contributor.course,
        meanRating,
        ratingCount,
      };
}

/** Rank contributors: course, then kind, then stable identity. */
function compareContributorDtos(
  left: ProgramHeadOutcomeDTO["contributors"][number],
  right: ProgramHeadOutcomeDTO["contributors"][number]
): number {
  const courseOrder = (left.course?.code ?? "").localeCompare(right.course?.code ?? "");
  if (courseOrder !== 0) return courseOrder;
  if (left.kind !== right.kind) return left.kind.localeCompare(right.kind);
  return compareSameKindContributors(left, right);
}

function compareSameKindContributors(
  left: ProgramHeadOutcomeDTO["contributors"][number],
  right: ProgramHeadOutcomeDTO["contributors"][number]
): number {
  if (left.kind === "CILO" && right.kind === "CILO") {
    return left.ciloCode.localeCompare(right.ciloCode) || left.ciloId.localeCompare(right.ciloId);
  }
  if (left.kind === "DIRECT_GO" && right.kind === "DIRECT_GO") {
    return (
      left.deploymentName.localeCompare(right.deploymentName) ||
      left.itemKey.localeCompare(right.itemKey)
    );
  }
  return 0;
}

function contributorDtosFor(
  aggregate: OutcomeEvidenceAggregate
): ProgramHeadOutcomeDTO["contributors"] {
  return [...aggregate.contributors.values()].map(contributorDtoFor).sort(compareContributorDtos);
}

export function buildProgramHeadOutcomeDtos(
  aggregation: OutcomeEvidenceAggregation
): ProgramHeadOutcomeDTO[] {
  const rows: ProgramHeadOutcomeDTO[] = [];

  for (const aggregate of aggregation.outcomes.values()) {
    const distributions: ProgramHeadOutcomeScaleDistributionDTO[] = [];
    for (const distribution of aggregate.distributions.values()) {
      const total = [...distribution.counts.values()].reduce((sum, count) => sum + count, 0);
      const categories: ProgramHeadOutcomeCategoryDTO[] = distribution.descriptors.map(
        (descriptor) => {
          const count = distribution.counts.get(descriptor.value) ?? 0;
          return {
            value: descriptor.value,
            label: descriptor.label,
            count,
            percentage: total === 0 ? 0 : count / total,
          };
        }
      );
      distributions.push({ scaleLabel: describeScale(distribution.descriptors), categories });
    }
    distributions.sort((left, right) => left.scaleLabel.localeCompare(right.scaleLabel));

    rows.push({
      goId: aggregate.goId,
      code: aggregate.code,
      name: aggregate.name,
      meanRating: aggregate.ratingCount === 0 ? null : aggregate.ratingSum / aggregate.ratingCount,
      ratingCount: aggregate.ratingCount,
      submittedResponseCount: aggregate.responseIds.size,
      contributingCilos: [...aggregate.cilos.entries()]
        .map(([id, description]) => ({ id, description }))
        .sort((left, right) => left.description.localeCompare(right.description)),
      contributingCourses: [...aggregate.courses.entries()]
        .map(([id, course]) => ({ id, code: course.code, title: course.title }))
        .sort((left, right) => left.code.localeCompare(right.code)),
      contributors: contributorDtosFor(aggregate),
      evidenceEvaluations: [...aggregate.evaluations.entries()]
        .map(([evaluationId, deploymentName]) => ({ evaluationId, deploymentName }))
        .sort((left, right) => left.deploymentName.localeCompare(right.deploymentName)),
      distributions,
      spansMultipleScales: aggregate.distributions.size > 1,
      excludedRatingCount: aggregate.excludedRatingCount,
      evidenceSummary: {
        ratingCount: aggregate.ratingCount,
        responseCount: aggregate.responseIds.size,
        evaluationCount: aggregate.evaluations.size,
        scaleLabel: distributions.length === 1 ? distributions[0].scaleLabel : undefined,
        explanation:
          aggregate.distributions.size > 1
            ? `Ratings span ${aggregate.distributions.size} incompatible scales; each scale is reported separately with no combined mean.`
            : `Mean of ${aggregate.ratingCount} valid ratings from ${aggregate.evaluations.size} course-bound evaluation(s); general items and unbound questions are excluded.`,
      },
    });
  }

  rows.sort((left, right) => {
    const leftMean = left.meanRating ?? -Infinity;
    const rightMean = right.meanRating ?? -Infinity;
    return (
      rightMean - leftMean ||
      left.code.localeCompare(right.code) ||
      left.goId.localeCompare(right.goId)
    );
  });

  return rows;
}

// ---------------------------------------------------------------------------
// Stakeholder and contextual breakdown evidence
// ---------------------------------------------------------------------------

/**
 * Narrow structural rating row for stakeholder and breakdown aggregation.
 * The service's Prisma select output must structurally match this shape;
 * helpers stay pure and unit-testable.
 */
export type BreakdownRatingRow = {
  rating_value: number;
  response_id: string;
  section_key: string;
  item_key: string;
  response: {
    assignment: {
      course_bound: {
        id: string;
        deployment_name: string;
        course_assignment: { course: { id: string; code: string; title: string } };
        instrument: {
          id: string;
          version_number: number;
          template: { name: string };
        };
        /**
         * Year-level targets for the selected Program only. The service
         * pre-filters targets by the selected Program; a single non-null
         * target makes year-level attribution defensible.
         */
        targets: Array<{ year_level: YearLevel | null }>;
      } | null;
      central_deployment: {
        target_stakeholder: TargetStakeholder;
        major: { id: string; name: string } | null;
        year_level: YearLevel | null;
        instrument: {
          id: string;
          version_number: number;
          template: { name: string };
        };
      } | null;
    };
  };
};

/** Narrow structural response row used for bucket response counts. */
export type BreakdownResponseRow = {
  id: string;
  assignment: {
    course_bound: {
      id: string;
      deployment_name: string;
      course_assignment: { course: { id: string; code: string; title: string } };
      instrument: {
        id: string;
        version_number: number;
        template: { name: string };
      };
      /**
       * Year-level targets for the selected Program only. The service
       * pre-filters targets by the selected Program; a single non-null
       * target makes year-level attribution defensible.
       */
      targets: Array<{ year_level: YearLevel | null }>;
    } | null;
    central_deployment: {
      target_stakeholder: TargetStakeholder;
      major: { id: string; name: string } | null;
      year_level: YearLevel | null;
      instrument: {
        id: string;
        version_number: number;
        template: { name: string };
      };
    } | null;
  };
};

/** Assignment context shared by rating and response rows for attribution. */
export type BreakdownAssignmentContext = BreakdownResponseRow["assignment"];

/** Canonical evidence source metadata in display order. */
const STAKEHOLDER_SOURCES: ReadonlyArray<{
  key: ProgramHeadStakeholderSourceKey;
  label: string;
  description: string;
}> = [
  {
    key: "COURSE_STUDENT",
    label: "Course-bound student evidence",
    description: "Course-bound evaluations of assigned students.",
  },
  {
    key: "CENTRAL_STUDENT",
    label: "Central student-respondent evidence",
    description: "Central deployments targeting student respondents.",
  },
  {
    key: "ALUMNI",
    label: "Alumni evidence",
    description: "Central deployments targeting alumni respondents.",
  },
  {
    key: "INDUSTRY_PARTNER",
    label: "Industry Partner evidence",
    description: "Central deployments targeting industry partner respondents.",
  },
];

/**
 * Resolve the canonical source bucket of a central deployment target.
 * Course-bound evidence is always the COURSE_STUDENT bucket.
 */
function sourceKeyForTarget(
  courseBound: BreakdownResponseRow["assignment"]["course_bound"],
  targetStakeholder: TargetStakeholder | undefined
): ProgramHeadStakeholderSourceKey {
  if (courseBound) {
    return "COURSE_STUDENT";
  }
  if (targetStakeholder === "ALUMNI") {
    return "ALUMNI";
  }
  if (targetStakeholder === "INDUSTRY_PARTNER") {
    return "INDUSTRY_PARTNER";
  }
  return "CENTRAL_STUDENT";
}

const SOURCE_LABEL_BY_KEY: Record<ProgramHeadStakeholderSourceKey, string> = {
  COURSE_STUDENT: STAKEHOLDER_SOURCES[0].label,
  CENTRAL_STUDENT: STAKEHOLDER_SOURCES[1].label,
  ALUMNI: STAKEHOLDER_SOURCES[2].label,
  INDUSTRY_PARTNER: STAKEHOLDER_SOURCES[3].label,
};

/** Resolve the canonical source bucket of one rating row. */
function ratingRowSourceKey(row: BreakdownRatingRow): ProgramHeadStakeholderSourceKey {
  return sourceKeyForTarget(
    row.response.assignment.course_bound,
    row.response.assignment.central_deployment?.target_stakeholder
  );
}

function sourceLabel(key: ProgramHeadStakeholderSourceKey): string {
  return SOURCE_LABEL_BY_KEY[key];
}

function instrumentLabel(version: { version_number: number; template: { name: string } }): string {
  return `${version.template.name} v${version.version_number}`;
}

type StakeholderBucketAggregate = {
  sourceKey: ProgramHeadStakeholderSourceKey;
  ratingSum: number;
  ratingCount: number;
  responseIds: Set<string>;
  /** instrument version id -> readable label */
  instruments: Map<string, string>;
};

function getOrCreateBucket(
  buckets: Map<ProgramHeadStakeholderSourceKey, StakeholderBucketAggregate>,
  sourceKey: ProgramHeadStakeholderSourceKey
): StakeholderBucketAggregate {
  let bucket = buckets.get(sourceKey);
  if (!bucket) {
    bucket = {
      sourceKey,
      ratingSum: 0,
      ratingCount: 0,
      responseIds: new Set(),
      instruments: new Map(),
    };
    buckets.set(sourceKey, bucket);
  }
  return bucket;
}

/**
 * Aggregate submitted evidence into source-aware stakeholder buckets.
 * Course-bound ratings form the COURSE_STUDENT bucket; central ratings are
 * bucketed by their deployment's target stakeholder. Means are pooled within
 * a source only; rating count stays distinct from submitted response count.
 * Response rows contribute distinct submitted responses even when unrated.
 */
export function buildStakeholderBuckets(
  ratingRows: BreakdownRatingRow[],
  responseRows: BreakdownResponseRow[],
  snapshotById: Map<string, unknown>
): ProgramHeadStakeholderBucketDTO[] {
  const buckets = new Map<ProgramHeadStakeholderSourceKey, StakeholderBucketAggregate>();

  for (const row of ratingRows) {
    const sourceKey = ratingRowSourceKey(row);
    const bucket = getOrCreateBucket(buckets, sourceKey);
    if (ratingValueIsValid(row, snapshotById)) {
      bucket.ratingSum += row.rating_value;
      bucket.ratingCount += 1;
    }
    bucket.responseIds.add(row.response_id);
    const version =
      row.response.assignment.course_bound?.instrument ??
      row.response.assignment.central_deployment?.instrument;
    if (version) {
      bucket.instruments.set(version.id, instrumentLabel(version));
    }
  }

  for (const row of responseRows) {
    const sourceKey = sourceKeyForTarget(
      row.assignment.course_bound,
      row.assignment.central_deployment?.target_stakeholder
    );
    const bucket = getOrCreateBucket(buckets, sourceKey);
    bucket.responseIds.add(row.id);
    const version =
      row.assignment.course_bound?.instrument ?? row.assignment.central_deployment?.instrument;
    if (version) {
      bucket.instruments.set(version.id, instrumentLabel(version));
    }
  }

  return STAKEHOLDER_SOURCES.flatMap((source) => {
    const bucket = buckets.get(source.key);
    if (!bucket || bucket.responseIds.size === 0) {
      return [];
    }
    const instruments = [...bucket.instruments.values()].sort();
    return [
      {
        sourceKey: bucket.sourceKey,
        sourceLabel: source.label,
        sourceDescription: source.description,
        instrumentContext: instruments.length > 0 ? instruments.join(", ") : null,
        meanRating: bucket.ratingCount === 0 ? null : bucket.ratingSum / bucket.ratingCount,
        ratingCount: bucket.ratingCount,
        submittedResponseCount: bucket.responseIds.size,
      },
    ];
  });
}

/** A rating is valid only when its value belongs to the item's frozen scale. */
function ratingValueIsValid(row: BreakdownRatingRow, snapshotById: Map<string, unknown>): boolean {
  const version =
    row.response.assignment.course_bound?.instrument ??
    row.response.assignment.central_deployment?.instrument;
  if (!version) {
    return false;
  }
  const snapshot = snapshotById.get(version.id);
  if (!snapshot) {
    return false;
  }
  const descriptors = resolveSnapshotItemScale(snapshot, row.section_key, row.item_key);
  return (
    descriptors !== null && descriptors.some((descriptor) => descriptor.value === row.rating_value)
  );
}

type BreakdownAggregate = {
  ratingSum: number;
  ratingCount: number;
  responseIds: Set<string>;
};

function emptyBreakdownAggregate(): BreakdownAggregate {
  return { ratingSum: 0, ratingCount: 0, responseIds: new Set() };
}

function toBreakdownRow(
  aggregate: BreakdownAggregate,
  key: string,
  label: string,
  isUnspecified: boolean
): ProgramHeadBreakdownRowDTO {
  return {
    key,
    label,
    isUnspecified,
    meanRating: aggregate.ratingCount === 0 ? null : aggregate.ratingSum / aggregate.ratingCount,
    ratingCount: aggregate.ratingCount,
    submittedResponseCount: aggregate.responseIds.size,
  };
}

/**
 * Group course-bound ratings and responses by course. Central evidence never
 * contributes to course rows because course attribution exists only for
 * course-bound evidence. Submitted responses count even when they carry no
 * ratings; rows carry instrument disclosure and the course-bound evaluations
 * behind them for authorized review drill-through.
 */
export function buildCourseBreakdownRows(
  ratingRows: BreakdownRatingRow[],
  responseRows: BreakdownResponseRow[],
  snapshotById: Map<string, unknown>
): ProgramHeadCourseBreakdownRowDTO[] {
  const byCourse = new Map<
    string,
    BreakdownAggregate & {
      course: { id: string; code: string; title: string };
      instruments: Map<string, string>;
      evaluations: Map<string, string>;
    }
  >();

  for (const row of ratingRows) {
    const courseBound = row.response.assignment.course_bound;
    if (!courseBound) {
      continue;
    }
    const course = courseBound.course_assignment.course;
    let aggregate = byCourse.get(course.id);
    if (!aggregate) {
      aggregate = {
        ...emptyBreakdownAggregate(),
        course,
        instruments: new Map(),
        evaluations: new Map(),
      };
      byCourse.set(course.id, aggregate);
    }
    accumulateInto(aggregate, row, ratingValueIsValid(row, snapshotById));
    aggregate.instruments.set(courseBound.instrument.id, instrumentLabel(courseBound.instrument));
    aggregate.evaluations.set(courseBound.id, courseBound.deployment_name);
  }

  for (const row of responseRows) {
    const courseBound = row.assignment.course_bound;
    if (!courseBound) {
      continue;
    }
    const course = courseBound.course_assignment.course;
    let aggregate = byCourse.get(course.id);
    if (!aggregate) {
      aggregate = {
        ...emptyBreakdownAggregate(),
        course,
        instruments: new Map(),
        evaluations: new Map(),
      };
      byCourse.set(course.id, aggregate);
    }
    aggregate.responseIds.add(row.id);
    aggregate.instruments.set(courseBound.instrument.id, instrumentLabel(courseBound.instrument));
    aggregate.evaluations.set(courseBound.id, courseBound.deployment_name);
  }

  const rows: ProgramHeadCourseBreakdownRowDTO[] = [...byCourse.values()].map((aggregate) => {
    const instruments = [...aggregate.instruments.values()].sort();
    const evaluations = [...aggregate.evaluations.entries()]
      .map(([evaluationId, deploymentName]) => ({ evaluationId, deploymentName }))
      .sort((left, right) => left.deploymentName.localeCompare(right.deploymentName));
    return {
      ...toBreakdownRow(
        aggregate,
        aggregate.course.id,
        `${aggregate.course.code} — ${aggregate.course.title}`,
        false
      ),
      courseCode: aggregate.course.code,
      instrumentContext: instruments.length > 0 ? instruments.join(", ") : null,
      evidenceEvaluations: evaluations,
    };
  });

  rows.sort((left, right) => left.courseCode.localeCompare(right.courseCode));
  return rows;
}

/**
 * Group ratings and responses by instrument version with per-source
 * separation. A row never pools means across evidence sources: each source
 * keeps its own mean, rating count, and response count so unlike populations
 * are not treated as one construct. Submitted responses count even when they
 * carry no ratings.
 */
export function buildInstrumentBreakdownRows(
  ratingRows: BreakdownRatingRow[],
  responseRows: BreakdownResponseRow[],
  snapshotById: Map<string, unknown>
): ProgramHeadInstrumentBreakdownRowDTO[] {
  const byInstrument = new Map<
    string,
    {
      label: string;
      sources: Map<ProgramHeadStakeholderSourceKey, BreakdownAggregate>;
    }
  >();

  const getOrCreateInstrument = (version: {
    id: string;
    version_number: number;
    template: { name: string };
  }) => {
    let entry = byInstrument.get(version.id);
    if (!entry) {
      entry = { label: instrumentLabel(version), sources: new Map() };
      byInstrument.set(version.id, entry);
    }
    return entry;
  };

  for (const row of ratingRows) {
    const sourceKey = ratingRowSourceKey(row);
    const version =
      row.response.assignment.course_bound?.instrument ??
      row.response.assignment.central_deployment?.instrument;
    if (!version) {
      continue;
    }
    const entry = getOrCreateInstrument(version);
    let source = entry.sources.get(sourceKey);
    if (!source) {
      source = emptyBreakdownAggregate();
      entry.sources.set(sourceKey, source);
    }
    if (ratingValueIsValid(row, snapshotById)) {
      source.ratingSum += row.rating_value;
      source.ratingCount += 1;
    }
    source.responseIds.add(row.response_id);
  }

  for (const row of responseRows) {
    const sourceKey = sourceKeyForTarget(
      row.assignment.course_bound,
      row.assignment.central_deployment?.target_stakeholder
    );
    const version =
      row.assignment.course_bound?.instrument ?? row.assignment.central_deployment?.instrument;
    if (!version) {
      continue;
    }
    const entry = getOrCreateInstrument(version);
    let source = entry.sources.get(sourceKey);
    if (!source) {
      source = emptyBreakdownAggregate();
      entry.sources.set(sourceKey, source);
    }
    source.responseIds.add(row.id);
  }

  const rows: ProgramHeadInstrumentBreakdownRowDTO[] = [...byInstrument.entries()]
    .map(([instrumentVersionId, entry]) => {
      const sources: ProgramHeadInstrumentSourceDTO[] = STAKEHOLDER_SOURCES.flatMap((source) => {
        const aggregate = entry.sources.get(source.key);
        if (!aggregate || aggregate.responseIds.size === 0) {
          return [];
        }
        return [
          {
            ...toBreakdownRow(
              aggregate,
              `${instrumentVersionId}:${source.key}`,
              source.label,
              false
            ),
            sourceKey: source.key,
            sourceLabel: source.label,
          },
        ];
      });
      return { instrumentVersionId, instrumentLabel: entry.label, sources };
    })
    .filter((row) => row.sources.length > 0);

  rows.sort((left, right) => left.instrumentLabel.localeCompare(right.instrumentLabel));
  return rows;
}

/**
 * Group ratings and responses by a defensible attribution key, keeping every
 * evidence source separate: unlike populations are never pooled into one
 * construct, so each row belongs to exactly one source bucket. Rows whose
 * attribution is missing (or ambiguous) fall into per-source `Unspecified`
 * aggregates; the system never guesses an attribute from names, text, or
 * current profiles. Submitted responses count even when they carry no
 * ratings. Defensible rows rank by mean rating descending, then label.
 */
export function buildAttributionBreakdown(
  ratingRows: BreakdownRatingRow[],
  responseRows: BreakdownResponseRow[],
  snapshotById: Map<string, unknown>,
  attributionOf: (assignment: BreakdownAssignmentContext) => { key: string; label: string } | null
): { rows: ProgramHeadBreakdownRowDTO[]; unspecified: ProgramHeadBreakdownRowDTO[] } {
  const byKey = new Map<string, BreakdownAggregate & { key: string; label: string }>();
  const unspecifiedBySource = new Map<string, BreakdownAggregate>();

  const rowSourceKey = (row: BreakdownRatingRow | BreakdownResponseRow) =>
    "response" in row
      ? ratingRowSourceKey(row)
      : sourceKeyForTarget(
          row.assignment.course_bound,
          row.assignment.central_deployment?.target_stakeholder
        );

  const accumulateAttributed = (
    assignment: BreakdownAssignmentContext,
    row: BreakdownRatingRow | BreakdownResponseRow
  ) => {
    const attribution = attributionOf(assignment);
    const sourceKey = rowSourceKey(row);
    const isValidRating = !("response_id" in row) || ratingValueIsValid(row, snapshotById);
    if (!attribution) {
      let aggregate = unspecifiedBySource.get(sourceKey);
      if (!aggregate) {
        aggregate = emptyBreakdownAggregate();
        unspecifiedBySource.set(sourceKey, aggregate);
      }
      accumulateEvidenceRow(aggregate, row, isValidRating);
      return;
    }
    const rowKey = `${sourceKey}:${attribution.key}`;
    let aggregate = byKey.get(rowKey);
    if (!aggregate) {
      aggregate = {
        ...emptyBreakdownAggregate(),
        key: rowKey,
        label: `${attribution.label} — ${sourceLabel(sourceKey)}`,
      };
      byKey.set(rowKey, aggregate);
    }
    accumulateEvidenceRow(aggregate, row, isValidRating);
  };

  for (const row of ratingRows) {
    accumulateAttributed(row.response.assignment, row);
  }
  for (const row of responseRows) {
    accumulateAttributed(row.assignment, row);
  }

  const rows = [...byKey.values()].map((aggregate) =>
    toBreakdownRow(aggregate, aggregate.key, aggregate.label, false)
  );
  rows.sort(
    (left, right) =>
      (right.meanRating ?? -Infinity) - (left.meanRating ?? -Infinity) ||
      left.label.localeCompare(right.label)
  );

  const unspecified = [...unspecifiedBySource.entries()].map(([sourceKey, aggregate]) =>
    toBreakdownRow(
      aggregate,
      `unspecified:${sourceKey}`,
      `Unspecified — ${sourceLabel(sourceKey as ProgramHeadStakeholderSourceKey)}`,
      true
    )
  );

  return { rows, unspecified };
}

/** Accumulate one rating row into an existing breakdown aggregate. Only valid in-scale ratings add sums and counts. */
function accumulateInto(
  aggregate: BreakdownAggregate,
  row: BreakdownRatingRow,
  isValidRating: boolean
): void {
  if (isValidRating) {
    aggregate.ratingSum += row.rating_value;
    aggregate.ratingCount += 1;
  }
  aggregate.responseIds.add(row.response_id);
}

/** Accumulate one rating or response row: valid ratings add sums, both add identity. */
function accumulateEvidenceRow(
  aggregate: BreakdownAggregate,
  row: BreakdownRatingRow | BreakdownResponseRow,
  isValidRating: boolean
): void {
  if ("response_id" in row) {
    if (isValidRating) {
      aggregate.ratingSum += row.rating_value;
      aggregate.ratingCount += 1;
    }
    aggregate.responseIds.add(row.response_id);
    return;
  }
  aggregate.responseIds.add(row.id);
}

/**
 * Major attribution is defensible only for central deployments that target a
 * major. Course-bound evidence does not snapshot a major and central
 * deployments without a targeted major are reported as Unspecified.
 */
export function majorAttributionOf(
  assignment: BreakdownAssignmentContext
): { key: string; label: string } | null {
  const major = assignment.central_deployment?.major;
  return major ? { key: major.id, label: major.name } : null;
}

/**
 * Year-level attribution is defensible when a central deployment targets one
 * year level, or a course-bound evaluation targets exactly one year level for
 * the selected Program (the service pre-filters targets by Program). Untargeted
 * or multi-year evaluations are reported as Unspecified.
 */
export function yearLevelAttributionOf(
  assignment: BreakdownAssignmentContext
): { key: string; label: string } | null {
  const central = assignment.central_deployment;
  if (central) {
    return central.year_level
      ? { key: `year-${central.year_level}`, label: getYearLevelDisplay(central.year_level) }
      : null;
  }
  const targets = assignment.course_bound?.targets ?? [];
  if (targets.length !== 1 || !targets[0].year_level) {
    return null;
  }
  return {
    key: `year-${targets[0].year_level}`,
    label: getYearLevelDisplay(targets[0].year_level),
  };
}
