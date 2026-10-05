import {
  ratingBelongsToScale,
  resolveItemScaleIdentity,
} from "@/features/analytics/aggregators/scale-identity";

/** One submitted rating item with the instrument snapshot that defines its scale. */
type ScopedRatingItem = {
  rating_value: number;
  section_key: string;
  item_key: string;
};

/**
 * Mean over ratings that share exactly one compatible scale (§9).
 *
 * Every evaluation list, dashboard, and detail surface reports the same number
 * for the same evidence, so this rule lives once:
 *
 * - A rating contributes only when the frozen structure snapshot resolves a
 *   scale for its own question key and the value belongs to that scale. Values
 *   outside their scale are excluded rather than pooled.
 * - A mean is reported only when the surviving ratings resolve to a single
 *   scale identity. Mixed scales have no combined mean; the caller renders
 *   `null` and its scale label instead of a number that means nothing.
 * - No resolved rating means no mean, not zero.
 */
export function comparableRatingMean(
  ratings: readonly ScopedRatingItem[],
  snapshot: unknown
): number | null {
  const scaleKeys = new Set<string>();
  let sum = 0;
  let count = 0;

  for (const rating of ratings) {
    const scale = resolveItemScaleIdentity(snapshot, rating.section_key, rating.item_key);
    if (scale === null || !ratingBelongsToScale(scale, rating.rating_value)) continue;
    scaleKeys.add(scale.key);
    sum += rating.rating_value;
    count += 1;
  }

  return count > 0 && scaleKeys.size === 1 ? sum / count : null;
}
