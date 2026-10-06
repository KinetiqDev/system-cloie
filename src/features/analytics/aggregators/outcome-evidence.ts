import { describeScale, resolveSnapshotItemScale, type ScaleDescriptor } from "./scale-identity";
import { encodeContributionKey, encodeDirectContributorKey } from "./question-identity";
import type {
  OutcomeCategoryDTO,
  OutcomeContributorDTO,
  OutcomeEvidenceDTO,
  OutcomeScaleDistributionDTO,
} from "../outcome-evidence-types";

// ---------------------------------------------------------------------------
// Outcome evidence (Graduate Outcome and Institutional Learning Outcome)
//
// One engine for both typed alignment layers. A rating reaches an outcome
// through its frozen CILO binding and that CILO's current mappings, or through
// a frozen direct question binding (GO only). Each submitted response item
// contributes once per (response, evaluation, question, outcome).
// ---------------------------------------------------------------------------

type Manifestation = "LEARNING" | "PRACTICE" | "OPPORTUNITY" | null;
type EvidenceCourse = { id: string; code: string; title: string } | null;

/** One normalized course-bound rating row ready for outcome aggregation. */
export type OutcomeEvidenceRow = {
  ratingValue: number;
  responseId: string;
  sectionKey: string;
  itemKey: string;
  /** Frozen structure snapshot of the instrument version that produced the rating. */
  instrumentVersion: { id: string; structureSnapshot: unknown } | null;
  course: EvidenceCourse;
  /** CILO provenance for current CILO mappings, when present. */
  cilo: {
    id: string;
    code: string;
    description: string;
    course: EvidenceCourse;
  } | null;
  /** Current typed CILO mappings into the target outcome layer. */
  outcomeMappings: Array<{
    outcomeId: string;
    code: string;
    name: string;
    manifestation: Manifestation;
  }>;
  /** Frozen direct question-to-outcome bindings published with the evaluation. */
  directBindings: Array<{
    outcomeId: string;
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
  course: EvidenceCourse;
  manifestation: Manifestation;
  ratingSum: number;
  ratingCount: number;
};

type DirectContributorAggregate = {
  kind: "DIRECT";
  evaluationId: string;
  deploymentName: string;
  sectionKey: string;
  itemKey: string;
  questionPrompt: string;
  course: EvidenceCourse;
  ratingSum: number;
  ratingCount: number;
};

/** Accumulated evidence behind one outcome row. */
type OutcomeEvidenceAggregate = {
  outcomeId: string;
  code: string;
  name: string;
  ratingSum: number;
  ratingCount: number;
  responseIds: Set<string>;
  cilos: Map<string, string>;
  courses: Map<string, { code: string; title: string }>;
  evaluations: Map<string, string>;
  contributors: Map<string, CiloContributorAggregate | DirectContributorAggregate>;
  /** scaleKey (descriptor JSON) -> per-category counts */
  distributions: Map<string, { descriptors: ScaleDescriptor[]; counts: Map<number, number> }>;
  excludedRatingCount: number;
};

type OutcomeEvidenceAggregation = {
  /** Aggregates keyed by outcome id. */
  outcomes: Map<string, OutcomeEvidenceAggregate>;
  /** True when any contributing CILO maps to more than one outcome. */
  hasMultiMappedCilo: boolean;
};

type OutcomeBinding = { outcomeId: string; code: string; name: string };

function getOrCreateOutcomeAggregate(
  outcomes: Map<string, OutcomeEvidenceAggregate>,
  binding: OutcomeBinding
): OutcomeEvidenceAggregate {
  let aggregate = outcomes.get(binding.outcomeId);
  if (!aggregate) {
    aggregate = {
      outcomeId: binding.outcomeId,
      code: binding.code,
      name: binding.name,
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
    outcomes.set(binding.outcomeId, aggregate);
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
export function ratingIsValid(descriptors: ScaleDescriptor[] | null, value: number): boolean {
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
  manifestation: Manifestation
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
  binding: OutcomeEvidenceRow["directBindings"][number]
): void {
  const key = encodeDirectContributorKey(row.evaluationId, row.sectionKey, row.itemKey);
  let contributor = aggregate.contributors.get(key) as DirectContributorAggregate | undefined;
  if (!contributor) {
    contributor = {
      kind: "DIRECT",
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

/** Claim one (response, evaluation, question, outcome) contribution; false when already counted. */
function claimContribution(
  seenContributions: Set<string>,
  row: OutcomeEvidenceRow,
  outcomeId: string
): boolean {
  const key = encodeContributionKey(
    row.responseId,
    row.evaluationId,
    row.sectionKey,
    row.itemKey,
    outcomeId
  );
  if (seenContributions.has(key)) return false;
  seenContributions.add(key);
  return true;
}

function accumulateOutcomeEvidenceRow(
  outcomes: Map<string, OutcomeEvidenceAggregate>,
  seenContributions: Set<string>,
  row: OutcomeEvidenceRow
): void {
  const descriptors = resolveRatingScale(row);
  const isValidRating = ratingIsValid(descriptors, row.ratingValue);
  if (row.cilo) {
    for (const mapping of row.outcomeMappings) {
      if (!claimContribution(seenContributions, row, mapping.outcomeId)) continue;
      const aggregate = getOrCreateOutcomeAggregate(outcomes, mapping);
      if (accumulateOutcomeValue(aggregate, row, descriptors, isValidRating)) {
        accumulateCiloContributor(aggregate, row, row.cilo, mapping.manifestation);
      }
    }
  }
  for (const binding of row.directBindings) {
    if (!claimContribution(seenContributions, row, binding.outcomeId)) continue;
    const aggregate = getOrCreateOutcomeAggregate(outcomes, binding);
    if (accumulateOutcomeValue(aggregate, row, descriptors, isValidRating)) {
      accumulateDirectContributor(aggregate, row, binding);
    }
  }
}

/**
 * Aggregate course-bound ratings into outcome rows through current CILO
 * mappings and frozen direct question bindings. One response item contributes
 * once per outcome even when both paths name the same outcome.
 */
export function aggregateOutcomeEvidence(rows: OutcomeEvidenceRow[]): OutcomeEvidenceAggregation {
  const outcomes = new Map<string, OutcomeEvidenceAggregate>();
  const seenContributions = new Set<string>();
  let hasMultiMappedCilo = false;

  for (const row of rows) {
    if (row.cilo && new Set(row.outcomeMappings.map((mapping) => mapping.outcomeId)).size > 1) {
      hasMultiMappedCilo = true;
    }
    accumulateOutcomeEvidenceRow(outcomes, seenContributions, row);
  }

  return { outcomes, hasMultiMappedCilo };
}

function contributorDtoFor(
  contributor: CiloContributorAggregate | DirectContributorAggregate
): OutcomeContributorDTO {
  const meanRating = contributor.ratingSum / contributor.ratingCount;
  const ratingCount = contributor.ratingCount;
  return contributor.kind === "CILO"
    ? {
        kind: "CILO",
        ciloId: contributor.ciloId,
        ciloCode: contributor.ciloCode,
        ciloDescription: contributor.ciloDescription,
        course: contributor.course,
        manifestation: contributor.manifestation,
        meanRating,
        ratingCount,
      }
    : {
        kind: "DIRECT",
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
function compareContributorDtos(left: OutcomeContributorDTO, right: OutcomeContributorDTO): number {
  const courseOrder = (left.course?.code ?? "").localeCompare(right.course?.code ?? "");
  if (courseOrder !== 0) return courseOrder;
  if (left.kind !== right.kind) return left.kind.localeCompare(right.kind);
  if (left.kind === "CILO" && right.kind === "CILO") {
    return left.ciloCode.localeCompare(right.ciloCode) || left.ciloId.localeCompare(right.ciloId);
  }
  if (left.kind === "DIRECT" && right.kind === "DIRECT") {
    return (
      left.deploymentName.localeCompare(right.deploymentName) ||
      left.itemKey.localeCompare(right.itemKey)
    );
  }
  return 0;
}

function distributionDtosFor(aggregate: OutcomeEvidenceAggregate): OutcomeScaleDistributionDTO[] {
  const distributions: OutcomeScaleDistributionDTO[] = [];
  for (const distribution of aggregate.distributions.values()) {
    const total = [...distribution.counts.values()].reduce((sum, count) => sum + count, 0);
    const categories: OutcomeCategoryDTO[] = distribution.descriptors.map((descriptor) => {
      const count = distribution.counts.get(descriptor.value) ?? 0;
      return {
        value: descriptor.value,
        label: descriptor.label,
        count,
        percentage: total === 0 ? 0 : count / total,
      };
    });
    distributions.push({
      scaleLabel: describeScale(distribution.descriptors),
      maxValue: Math.max(...distribution.descriptors.map((descriptor) => descriptor.value)),
      categories,
    });
  }
  return distributions.sort((left, right) => left.scaleLabel.localeCompare(right.scaleLabel));
}

/**
 * Convert outcome aggregates into ranked, closed DTO rows. Rows rank by mean
 * rating descending, then code for stable ordering. Distribution percentages
 * are computed at full precision and rounded only for display.
 */
export function buildOutcomeEvidenceDtos(
  aggregation: OutcomeEvidenceAggregation
): OutcomeEvidenceDTO[] {
  const rows: OutcomeEvidenceDTO[] = [];

  for (const aggregate of aggregation.outcomes.values()) {
    const distributions = distributionDtosFor(aggregate);
    rows.push({
      outcomeId: aggregate.outcomeId,
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
      contributors: [...aggregate.contributors.values()]
        .map(contributorDtoFor)
        .sort(compareContributorDtos),
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
            ? `Mean of ${aggregate.ratingCount} valid ratings pooled across ${aggregate.distributions.size} distinct scales; cross-scale values are not directly comparable. Each scale's distribution is reported separately.`
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
      left.outcomeId.localeCompare(right.outcomeId)
    );
  });

  return rows;
}
