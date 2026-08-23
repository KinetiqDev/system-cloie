import type { ScaleIdentity } from "./scale-identity";
import { ratingBelongsToScale } from "./scale-identity";
import { buildQuantitativeMetric, type QuantitativeRating } from "./quantitative";
import type { QuantitativeMetric } from "./types";
import type { OutcomeItemRatingRow } from "./cilo";

// ---------------------------------------------------------------------------
// PLO metric aggregation (spec §5.8, §5.9, §7, §9)
// ---------------------------------------------------------------------------

/**
 * Canonical Program Learning Outcome metric. Every valid rating that reaches
 * the PLO pools into its raw mean — through current CILO-to-PLO mappings for
 * course-derived evidence (§5.8), or through published deployment PLO
 * snapshots for program-wide evidence (§5.9). Manifestations never filter or
 * weight contributions (§7). Evidence spanning incompatible scales stays in
 * separate scaleGroups with no combined mean (§9); `mean` and `responseCount`
 * pool only compatible-scale ratings, while `ratingCount` counts every valid
 * contributing rating.
 */
export type PloMetric = {
  ploId: string;
  ploCode: string;
  ploDescription: string;

  /** Mean of the single compatible scale group; null when zero groups or mixed. */
  mean: number | null;

  /** Valid contributing ratings across every scale group. */
  ratingCount: number;

  /** Distinct submitted responses behind the valid ratings. */
  responseCount: number;

  /** One metric per compatible scale identity; length 1 mirrors `mean`. */
  scaleGroups: QuantitativeMetric[];

  spansMultipleScales: boolean;

  /** Ratings dropped as out-of-scale or unresolvable, counted diagnostically. */
  excludedRatingCount: number;

  /** Course-derived only: CILOs whose bound questions reached this PLO. */
  contributingCilos: Array<{ id: string; label: string }>;
};

type PloGroup = {
  scale: ScaleIdentity | null;
  ratings: QuantitativeRating[];
};

type PloAggregate = {
  ploCode: string;
  ploDescription: string;
  groups: Map<string, PloGroup>;
  responseIds: Set<string>;
  excludedRatingCount: number;
  cilos: Map<string, string>;
};

/** One rating reaching one PLO through one binding row. */
type PloBinding = {
  ploId: string;
  ploCode: string;
  ploDescription: string;
};

function getOrCreateAggregate(
  aggregates: Map<string, PloAggregate>,
  binding: PloBinding
): PloAggregate {
  let aggregate = aggregates.get(binding.ploId);
  if (!aggregate) {
    aggregate = {
      ploCode: binding.ploCode,
      ploDescription: binding.ploDescription,
      groups: new Map(),
      responseIds: new Set(),
      excludedRatingCount: 0,
      cilos: new Map(),
    };
    aggregates.set(binding.ploId, aggregate);
  }
  return aggregate;
}

function accumulate(
  aggregate: PloAggregate,
  value: number,
  responseId: string,
  scale: ScaleIdentity | null,
  cilo: { id: string; label: string } | null
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
}

function finalize(aggregates: Map<string, PloAggregate>): PloMetric[] {
  return [...aggregates.entries()]
    .map(([ploId, aggregate]) => {
      const scaleGroups = [...aggregate.groups.values()]
        .map((group) => buildQuantitativeMetric(group.ratings, group.scale))
        .sort((left, right) => (left.scale?.key ?? "").localeCompare(right.scale?.key ?? ""));
      const ratingCount = scaleGroups.reduce((sum, group) => sum + group.ratingCount, 0);
      return {
        ploId,
        ploCode: aggregate.ploCode,
        ploDescription: aggregate.ploDescription,
        mean: scaleGroups.length === 1 ? scaleGroups[0].mean : null,
        ratingCount,
        responseCount: aggregate.responseIds.size,
        scaleGroups,
        spansMultipleScales: scaleGroups.length > 1,
        excludedRatingCount: aggregate.excludedRatingCount,
        contributingCilos: [...aggregate.cilos.entries()].map(([id, label]) => ({ id, label })),
      };
    })
    .sort(
      (left, right) =>
        left.ploCode.localeCompare(right.ploCode) || left.ploId.localeCompare(right.ploId)
    );
}

/**
 * Aggregate course-bound ratings into PLO metrics through the selected
 * Program's current CILO-to-PLO mappings (§5.8). Each valid rating
 * contributes once to every mapped PLO (many-to-many); GENERAL items and
 * unmapped CILOs never create PLO evidence (§6.5). Historical ratings are
 * grouped by the Program's current mappings — publication-time course
 * mapping snapshots do not exist (§44 limitation).
 */
export function buildCourseDerivedPloMetrics(rows: OutcomeItemRatingRow[]): PloMetric[] {
  const aggregates = new Map<string, PloAggregate>();

  for (const row of rows) {
    if (!row.cilo || row.ploMappings.length === 0) {
      continue;
    }
    const cilo = { id: row.cilo.id, label: row.cilo.label };
    // One rating contributes once per PLO even if a caller passes duplicate
    // mapping rows (§54 duplicate contribution prevention).
    const seenPlos = new Set<string>();
    for (const mapping of row.ploMappings) {
      if (seenPlos.has(mapping.ploId)) {
        continue;
      }
      seenPlos.add(mapping.ploId);
      const aggregate = getOrCreateAggregate(aggregates, {
        ploId: mapping.ploId,
        ploCode: mapping.ploCode,
        ploDescription: mapping.ploDescription,
      });
      accumulate(aggregate, row.ratingValue, row.responseId, row.scale, cilo);
    }
  }

  return finalize(aggregates);
}

/** One program-wide rating with its deployment's snapshot PLO bindings (§5.9). */
export type CentralPloRatingRow = {
  sectionKey: string;
  itemKey: string;
  ratingValue: number;
  responseId: string;
  scale: ScaleIdentity | null;
  /** Snapshot bindings of the deployment for this item; several PLOs allowed. */
  ploBindings: Array<PloBinding>;
};

/**
 * Aggregate program-wide ratings into PLO metrics through published
 * CentralDeploymentPloSnapshot bindings (§5.9). One question may cover
 * several PLOs and a PLO several questions without implying weights; each
 * covered PLO receives the raw rating once.
 */
export function buildProgramWidePloMetrics(rows: CentralPloRatingRow[]): PloMetric[] {
  const aggregates = new Map<string, PloAggregate>();

  for (const row of rows) {
    if (row.ploBindings.length === 0) {
      continue;
    }
    // One rating contributes once per PLO even if a caller passes duplicate
    // snapshot rows (§54 duplicate contribution prevention).
    const seenPlos = new Set<string>();
    for (const binding of row.ploBindings) {
      if (seenPlos.has(binding.ploId)) {
        continue;
      }
      seenPlos.add(binding.ploId);
      const aggregate = getOrCreateAggregate(aggregates, binding);
      accumulate(aggregate, row.ratingValue, row.responseId, row.scale, null);
    }
  }

  return finalize(aggregates);
}
