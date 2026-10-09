import type { OutcomeEvidenceDTO } from "@/features/analytics/outcome-evidence-types";
import { LikertDistributionTable } from "./likert-distribution-table";
import { AttainmentBadge } from "./outcome-attainment-badge";
import { OUTCOME_ATTAINMENT_BENCHMARK } from "../aggregators/outcome-attainment";

/** How many decimals the detail mean carries beyond the two-decimal summary. */
const DETAIL_MEAN_DECIMALS = 4;

/**
 * Rounds to a bounded number of decimals and drops trailing zeros, so the
 * detail mean shows the narrowest exact-looking value without the trailing
 * float noise a raw IEEE-754 division exposes (3.8703703703703702).
 */
function formatBoundedMean(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(/\.?0+$/, "");
}

/**
 * Contextual detail for one outcome evidence row: the mean at higher
 * precision than the two-decimal summary, scale-separated Likert
 * distributions, and a diagnostic count of ratings excluded from the valid
 * aggregate.
 */
export function OutcomeEvidenceDetail({ outcome }: { outcome: OutcomeEvidenceDTO }) {
  const benchmarkDelta =
    outcome.meanRating !== null ? outcome.meanRating - OUTCOME_ATTAINMENT_BENCHMARK : null;

  return (
    <div className="flex max-w-full flex-col gap-4 overflow-hidden">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <span className="text-label-sm text-text-secondary">Mean Rating (higher precision)</span>
          <span className="text-body-md text-foreground tabular-nums">
            {outcome.meanRating === null
              ? "—"
              : formatBoundedMean(outcome.meanRating, DETAIL_MEAN_DECIMALS)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-label-sm text-text-secondary">Rating Count</span>
          <span className="text-body-md text-foreground tabular-nums">{outcome.ratingCount}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-label-sm text-text-secondary">Attainment Status</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <AttainmentBadge attainment={outcome.attainment} />
            {benchmarkDelta !== null && outcome.attainment?.status === "classified" && (
              <span className="text-label-sm text-muted-foreground tabular-nums">
                ({benchmarkDelta >= 0 ? `+${benchmarkDelta.toFixed(2)}` : benchmarkDelta.toFixed(2)}{" "}
                vs 3.50 benchmark)
              </span>
            )}
          </div>
        </div>
      </div>

      {outcome.attainment?.isIndirect && (
        <p className="text-warning text-label-sm font-medium">
          Note: This evidence originates from an indirect stakeholder survey (reflects perceived
          attainment).
        </p>
      )}

      {outcome.distributions.length > 0 && (
        <div className="flex flex-col gap-4">
          <h4 className="text-title-sm text-foreground">Likert distribution by scale</h4>
          {outcome.distributions.map((distribution) => (
            <LikertDistributionTable
              key={JSON.stringify(
                distribution.categories.map(({ value, label }) => [value, label])
              )}
              distribution={distribution}
            />
          ))}
        </div>
      )}

      {outcome.spansMultipleScales && (
        <p className="text-body-sm text-text-secondary">
          This row&apos;s mean pools ratings from {outcome.distributions.length} distinct rating
          scales. Values across different scales are not directly comparable.
        </p>
      )}

      {outcome.excludedRatingCount > 0 && (
        <p className="text-body-sm text-text-secondary">
          {outcome.excludedRatingCount} rating
          {outcome.excludedRatingCount === 1 ? " was" : "s were"} excluded from the valid aggregate
          because the value could not be resolved against the frozen instrument scale.
        </p>
      )}
    </div>
  );
}
