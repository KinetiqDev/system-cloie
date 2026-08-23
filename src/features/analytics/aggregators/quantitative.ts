import type { ScaleIdentity } from "./scale-identity";
import type { QuantitativeMetric, ScaleCategoryCount } from "./types";

// ---------------------------------------------------------------------------
// Quantitative metric aggregation (spec §6, §9)
// ---------------------------------------------------------------------------

/** One valid submitted rating feeding a quantitative metric. */
export type QuantitativeRating = {
  value: number;
  responseId: string;
};

/**
 * Build one metric over ratings from a single compatible scale group (§9):
 * the mean pools raw ratings (never a mean of means), ratingCount and
 * responseCount stay distinct (§5.10–§5.11), and the distribution carries one
 * entry per scale value so sum(counts) = ratingCount and the weighted mean
 * equals `mean` within floating-point tolerance (§6.6).
 *
 * A null scale still yields counts and a mean; labels fall back to the raw
 * values because no snapshot labels resolved.
 */
export function buildQuantitativeMetric(
  ratings: QuantitativeRating[],
  scale: ScaleIdentity | null
): QuantitativeMetric {
  const counts = new Map<number, number>();
  const responseIds = new Set<string>();
  let ratingSum = 0;

  for (const rating of ratings) {
    counts.set(rating.value, (counts.get(rating.value) ?? 0) + 1);
    responseIds.add(rating.responseId);
    ratingSum += rating.value;
  }

  const ratingCount = ratings.length;
  const categories: Array<{ value: number; label: string }> = scale
    ? scale.descriptors.map((descriptor) => ({
        value: descriptor.value,
        label: descriptor.label ?? String(descriptor.value),
      }))
    : [...counts.keys()].sort((left, right) => left - right).map((value) => ({ value, label: String(value) }));

  const distribution: ScaleCategoryCount[] = categories.map(({ value, label }) => {
    const count = counts.get(value) ?? 0;
    return {
      value,
      label,
      count,
      percentage: ratingCount === 0 ? 0 : count / ratingCount,
    };
  });

  return {
    mean: ratingCount === 0 ? null : ratingSum / ratingCount,
    ratingCount,
    responseCount: responseIds.size,
    scale,
    distribution,
  };
}

/**
 * Group raw ratings by their resolved scale identity so incompatible scales
 * never merge into one metric (§9). Each entry becomes an independent
 * QuantitativeMetric; a null scale forms its own unlabeled group.
 */
export function groupRatingsByScale(
  entries: Array<{ rating: QuantitativeRating; scale: ScaleIdentity | null }>
): Array<{ scale: ScaleIdentity | null; metric: QuantitativeMetric }> {
  const groups = new Map<string, { scale: ScaleIdentity | null; ratings: QuantitativeRating[] }>();

  for (const { rating, scale } of entries) {
    const key = scale?.key ?? "";
    let group = groups.get(key);
    if (!group) {
      group = { scale, ratings: [] };
      groups.set(key, group);
    }
    group.ratings.push(rating);
  }

  return [...groups.values()].map(({ scale, ratings }) => ({
    scale,
    metric: buildQuantitativeMetric(ratings, scale),
  }));
}
