import type { ScaleIdentity } from "./scale-identity";
import { ratingBelongsToScale } from "./scale-identity";
import { buildQuantitativeMetric, type QuantitativeRating } from "./quantitative";
import type { QuantitativeMetric } from "./types";
import type { OutcomeItemRatingRow } from "./cilo";
import { encodeContributionKey, encodeQuestionKey } from "./question-identity";

// ---------------------------------------------------------------------------
// GO metric aggregation (spec §5.8, §5.9, §7, §9)
// ---------------------------------------------------------------------------

/**
 * Canonical Graduate Outcome metric. Every valid rating that reaches the
 * GO pools into its raw mean — through current CILO-to-GO mappings for
 * course-derived evidence (§5.8), or through published deployment GO
 * snapshots for program-wide evidence (§5.9). Manifestations never filter or
 * weight contributions (§7). Evidence spanning incompatible scales stays in
 * separate scaleGroups with no combined mean (§9); `mean` and `responseCount`
 * pool only compatible-scale ratings, while `ratingCount` counts every valid
 * contributing rating.
 */
export type GoMetric = {
  goId: string;
  goCode: string;
  goDescription: string;

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

  /** Course-derived only: CILOs whose bound questions reached this GO. */
  contributingCilos: Array<{ id: string; label: string }>;
};

type GoGroup = {
  scale: ScaleIdentity | null;
  ratings: QuantitativeRating[];
};

type GoAggregate = {
  goCode: string;
  goDescription: string;
  groups: Map<string, GoGroup>;
  responseIds: Set<string>;
  excludedRatingCount: number;
  cilos: Map<string, string>;
  evaluationIds: Set<string>;
  questionKeys: Set<string>;
};

/** One rating reaching one GO through one binding row. */
type GoBinding = {
  goId: string;
  goCode: string;
  goDescription: string;
};

function getOrCreateAggregate(
  aggregates: Map<string, GoAggregate>,
  binding: GoBinding
): GoAggregate {
  let aggregate = aggregates.get(binding.goId);
  if (!aggregate) {
    aggregate = {
      goCode: binding.goCode,
      goDescription: binding.goDescription,
      groups: new Map(),
      responseIds: new Set(),
      excludedRatingCount: 0,
      cilos: new Map(),
      evaluationIds: new Set(),
      questionKeys: new Set(),
    };
    aggregates.set(binding.goId, aggregate);
  }
  return aggregate;
}

function accumulate(
  aggregate: GoAggregate,
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

function finalize(aggregates: Map<string, GoAggregate>): GoMetric[] {
  return [...aggregates.entries()]
    .map(([goId, aggregate]) => {
      const scaleGroups = [...aggregate.groups.values()]
        .map((group) => buildQuantitativeMetric(group.ratings, group.scale))
        .sort((left, right) => (left.scale?.key ?? "").localeCompare(right.scale?.key ?? ""));
      const ratingCount = scaleGroups.reduce((sum, group) => sum + group.ratingCount, 0);
      return {
        goId,
        goCode: aggregate.goCode,
        goDescription: aggregate.goDescription,
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
        left.goCode.localeCompare(right.goCode) || left.goId.localeCompare(right.goId)
    );
}

/**
 * Aggregate course-bound ratings into GO metrics through the selected
 * Program's current CILO-to-GO mappings (§5.8). Each valid rating
 * contributes once to every mapped GO (many-to-many); GENERAL items and
 * unmapped CILOs never create GO evidence (§6.5). Historical ratings are
 * grouped by the Program's current mappings — publication-time course
 * mapping snapshots do not exist (§44 limitation).
 */
export function buildCourseDerivedGoMetrics(rows: OutcomeItemRatingRow[]): GoMetric[] {
  const aggregates = new Map<string, GoAggregate>();
  const seenContributions = new Set<string>();

  for (const row of rows) {
    if (
      row.goMappings.length === 0 &&
      (!row.directGoMappings || row.directGoMappings.length === 0)
    ) {
      continue;
    }
    const cilo = row.cilo ? { id: row.cilo.id, label: row.cilo.label } : null;
    const mappingGroups = [
      { mappings: row.goMappings, cilo },
      { mappings: row.directGoMappings ?? [], cilo: null },
    ];
    for (const { mappings, cilo: contributionCilo } of mappingGroups) {
      for (const mapping of mappings) {
        const contributionKey = encodeContributionKey(
          row.responseId,
          row.evaluationId ?? "",
          row.sectionKey,
          row.itemKey,
          mapping.goId
        );
        if (seenContributions.has(contributionKey)) {
          continue;
        }
        seenContributions.add(contributionKey);
        const aggregate = getOrCreateAggregate(aggregates, {
          goId: mapping.goId,
          goCode: mapping.goCode,
          goDescription: mapping.goDescription,
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
  }

  return finalize(aggregates);
}

/** One program-wide rating with its deployment's snapshot GO bindings (§5.9). */
export type CentralGoRatingRow = {
  /** Evaluation/deployment identity of the rating when the caller carries it. */
  evaluationId?: string;
  sectionKey: string;
  itemKey: string;
  ratingValue: number;
  responseId: string;
  scale: ScaleIdentity | null;
  /** Snapshot bindings of the deployment for this item; several GOs allowed. */
  goBindings: Array<GoBinding>;
};

/**
 * Aggregate program-wide ratings into GO metrics through published
 * CentralDeploymentGoSnapshot bindings (§5.9). One question may cover
 * several GOs and a GO several questions without implying weights; each
 * covered GO receives the raw rating once.
 */
export function buildProgramWideGoMetrics(rows: CentralGoRatingRow[]): GoMetric[] {
  const aggregates = new Map<string, GoAggregate>();

  for (const row of rows) {
    if (row.goBindings.length === 0) {
      continue;
    }
    // One rating contributes once per GO even if a caller passes duplicate
    // snapshot rows (§54 duplicate contribution prevention).
    const seenGos = new Set<string>();
    for (const binding of row.goBindings) {
      if (seenGos.has(binding.goId)) {
        continue;
      }
      seenGos.add(binding.goId);
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
