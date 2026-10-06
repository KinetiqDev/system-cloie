import type { ScaleIdentity } from "./scale-identity";
import { ratingBelongsToScale } from "./scale-identity";
import { buildQuantitativeMetric, type QuantitativeRating } from "./quantitative";
import type { QuantitativeMetric } from "./types";
import type { OutcomeItemRatingRow } from "./cilo";
import { encodeContributionKey, encodeQuestionKey } from "./question-identity";

// ---------------------------------------------------------------------------
// PO metric aggregation (spec §5.8, §5.9, §7, §9)
// ---------------------------------------------------------------------------

/**
 * Canonical Program Outcome metric. Every valid rating that reaches the
 * PO pools into its raw mean — through current CILO-to-PO mappings for
 * course-derived evidence (§5.8), or through published deployment PO
 * snapshots for program-wide evidence (§5.9). Manifestations never filter or
 * weight contributions (§7). Evidence spanning incompatible scales stays in
 * separate scaleGroups with no combined mean (§9); `mean` and `responseCount`
 * pool only compatible-scale ratings, while `ratingCount` counts every valid
 * contributing rating.
 */
export type PoMetric = {
  poId: string;
  poCode: string;
  poDescription: string;

  /** Mean of the single compatible scale group; null when zero groups or mixed. */
  mean: number | null;

  /** Valid contributing ratings across every scale group. */
  ratingCount: number;

  /** Distinct submitted responses behind the valid ratings. */
  responseCount: number;
  /** Distinct evaluations/deployments behind the valid ratings (§13.8 details). */
  evaluationCount: number;

  /** Distinct bound questions behind the valid ratings (§13.8 details). */
  questionCount: number;

  /** One metric per compatible scale identity; length 1 mirrors `mean`. */
  scaleGroups: QuantitativeMetric[];

  spansMultipleScales: boolean;

  /** Ratings dropped as out-of-scale or unresolvable, counted diagnostically. */
  excludedRatingCount: number;

  /** Course-derived only: CILOs whose bound questions reached this PO. */
  contributingCilos: Array<{ id: string; label: string }>;
};

type PoGroup = {
  scale: ScaleIdentity | null;
  ratings: QuantitativeRating[];
};

type PoAggregate = {
  poCode: string;
  poDescription: string;
  groups: Map<string, PoGroup>;
  responseIds: Set<string>;
  excludedRatingCount: number;
  cilos: Map<string, string>;
  evaluationIds: Set<string>;
  questionKeys: Set<string>;
};

/** One rating reaching one PO through one binding row. */
type PoBinding = {
  poId: string;
  poCode: string;
  poDescription: string;
};

function getOrCreateAggregate(
  aggregates: Map<string, PoAggregate>,
  binding: PoBinding
): PoAggregate {
  let aggregate = aggregates.get(binding.poId);
  if (!aggregate) {
    aggregate = {
      poCode: binding.poCode,
      poDescription: binding.poDescription,
      groups: new Map(),
      responseIds: new Set(),
      excludedRatingCount: 0,
      cilos: new Map(),
      evaluationIds: new Set(),
      questionKeys: new Set(),
    };
    aggregates.set(binding.poId, aggregate);
  }
  return aggregate;
}

function accumulate(
  aggregate: PoAggregate,
  value: number,
  responseId: string,
  scale: ScaleIdentity | null,
  cilo: { id: string; label: string } | null,
  questionKey: string,
  evaluationId?: string
): void {
  if (cilo) {
    aggregate.cilos.set(cilo.id, cilo.label);
  }
  if (!ratingBelongsToScale(scale, value)) {
    aggregate.excludedRatingCount += 1;
    return;
  }
  const key = scale?.key ?? "";
  let group = aggregate.groups.get(key);
  if (!group) {
    group = { scale, ratings: [] };
    aggregate.groups.set(key, group);
  }
  group.ratings.push({ value, responseId });
  aggregate.responseIds.add(responseId);
  aggregate.questionKeys.add(questionKey);
  if (evaluationId) {
    aggregate.evaluationIds.add(evaluationId);
  }
}

function finalize(aggregates: Map<string, PoAggregate>): PoMetric[] {
  return [...aggregates.entries()]
    .map(([poId, aggregate]) => {
      const scaleGroups = [...aggregate.groups.values()]
        .map((group) => buildQuantitativeMetric(group.ratings, group.scale))
        .sort((left, right) => (left.scale?.key ?? "").localeCompare(right.scale?.key ?? ""));
      const ratingCount = scaleGroups.reduce((sum, group) => sum + group.ratingCount, 0);
      return {
        poId,
        poCode: aggregate.poCode,
        poDescription: aggregate.poDescription,
        mean: scaleGroups.length === 1 ? scaleGroups[0].mean : null,
        ratingCount,
        responseCount: aggregate.responseIds.size,
        evaluationCount: aggregate.evaluationIds.size,
        questionCount: aggregate.questionKeys.size,
        scaleGroups,
        spansMultipleScales: scaleGroups.length > 1,
        excludedRatingCount: aggregate.excludedRatingCount,
        contributingCilos: [...aggregate.cilos.entries()].map(([id, label]) => ({ id, label })),
      };
    })
    .sort(
      (left, right) =>
        left.poCode.localeCompare(right.poCode) || left.poId.localeCompare(right.poId)
    );
}

/**
 * Aggregate course-bound ratings into PO metrics through the selected
 * Program's current CILO-to-PO mappings (§5.8). Each valid rating
 * contributes once to every mapped PO (many-to-many); GENERAL items and
 * unmapped CILOs never create PO evidence (§6.5). Historical ratings are
 * grouped by the Program's current mappings — publication-time course
 * mapping snapshots do not exist (§44 limitation).
 */
export function buildCourseDerivedPoMetrics(rows: OutcomeItemRatingRow[]): PoMetric[] {
  const aggregates = new Map<string, PoAggregate>();
  const seenContributions = new Set<string>();

  for (const row of rows) {
    accumulateCourseRow(aggregates, seenContributions, row);
  }

  return finalize(aggregates);
}

type CourseRowMappingGroup = {
  mappings: OutcomeItemRatingRow["poMappings"];
  cilo: { id: string; label: string } | null;
};

function courseRowMappingGroups(row: OutcomeItemRatingRow): CourseRowMappingGroup[] {
  const cilo = row.cilo ? { id: row.cilo.id, label: row.cilo.label } : null;
  return [
    { mappings: row.poMappings, cilo },
    { mappings: row.directPoMappings ?? [], cilo: null },
  ];
}

function hasCourseEvidence(row: OutcomeItemRatingRow): boolean {
  return row.poMappings.length > 0 || (row.directPoMappings?.length ?? 0) > 0;
}

function accumulateCourseRow(
  aggregates: Map<string, PoAggregate>,
  seenContributions: Set<string>,
  row: OutcomeItemRatingRow
): void {
  if (!hasCourseEvidence(row)) {
    return;
  }
  for (const { mappings, cilo: contributionCilo } of courseRowMappingGroups(row)) {
    accumulateMappingGroup(aggregates, seenContributions, row, mappings, contributionCilo);
  }
}

function accumulateMappingGroup(
  aggregates: Map<string, PoAggregate>,
  seenContributions: Set<string>,
  row: OutcomeItemRatingRow,
  mappings: OutcomeItemRatingRow["poMappings"],
  contributionCilo: { id: string; label: string } | null
): void {
  for (const mapping of mappings) {
    const contributionKey = encodeContributionKey(
      row.responseId,
      row.evaluationId ?? "",
      row.sectionKey,
      row.itemKey,
      mapping.poId
    );
    if (seenContributions.has(contributionKey)) {
      continue;
    }
    seenContributions.add(contributionKey);
    const aggregate = getOrCreateAggregate(aggregates, {
      poId: mapping.poId,
      poCode: mapping.poCode,
      poDescription: mapping.poDescription,
    });
    accumulate(
      aggregate,
      row.ratingValue,
      row.responseId,
      row.scale,
      contributionCilo,
      encodeQuestionKey(row.sectionKey, row.itemKey),
      row.evaluationId
    );
  }
}

/** One program-wide rating with its deployment's snapshot PO bindings (§5.9). */
export type CentralPoRatingRow = {
  /** Evaluation/deployment identity of the rating when the caller carries it. */
  evaluationId?: string;
  sectionKey: string;
  itemKey: string;
  ratingValue: number;
  responseId: string;
  scale: ScaleIdentity | null;
  /** Snapshot bindings of the deployment for this item; several POs allowed. */
  poBindings: Array<PoBinding>;
};

/**
 * Aggregate program-wide ratings into PO metrics through published
 * CentralDeploymentPoSnapshot bindings (§5.9). One question may cover
 * several POs and a PO several questions without implying weights; each
 * covered PO receives the raw rating once.
 */
export function buildProgramWidePoMetrics(rows: CentralPoRatingRow[]): PoMetric[] {
  const aggregates = new Map<string, PoAggregate>();

  for (const row of rows) {
    if (row.poBindings.length === 0) {
      continue;
    }
    // One rating contributes once per PO even if a caller passes duplicate
    // snapshot rows (§54 duplicate contribution prevention).
    const seenGos = new Set<string>();
    for (const binding of row.poBindings) {
      if (seenGos.has(binding.poId)) {
        continue;
      }
      seenGos.add(binding.poId);
      const aggregate = getOrCreateAggregate(aggregates, binding);
      accumulate(
        aggregate,
        row.ratingValue,
        row.responseId,
        row.scale,
        null,
        encodeQuestionKey(row.sectionKey, row.itemKey),
        row.evaluationId
      );
    }
  }

  return finalize(aggregates);
}
