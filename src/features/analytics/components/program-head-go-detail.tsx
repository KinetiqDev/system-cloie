import type { ProgramHeadOutcomeDTO } from "@/features/analytics/program-head-analytics-types";
import { ProgramHeadLikertDistribution } from "./program-head-likert-distribution";

/**
 * Contextual detail for one Graduate Outcome evidence row: the full-precision
 * mean, scale-separated Likert distributions, and a diagnostic count of
 * ratings excluded from the valid aggregate.
 */
export function ProgramHeadGoDetail({ outcome }: { outcome: ProgramHeadOutcomeDTO }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-label-sm text-text-secondary">Mean Rating (full precision)</span>
          <span className="text-body-md tabular-nums text-foreground">
            {outcome.meanRating === null ? "—" : String(outcome.meanRating)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-label-sm text-text-secondary">Rating Count</span>
          <span className="text-body-md tabular-nums text-foreground">{outcome.ratingCount}</span>
        </div>
      </div>

      {outcome.distributions.length > 0 && (
        <div className="flex flex-col gap-4">
          <h4 className="text-title-sm text-foreground">Likert distribution by scale</h4>
          {outcome.distributions.map((distribution) => (
            <ProgramHeadLikertDistribution
              key={distribution.scaleLabel}
              distribution={distribution}
            />
          ))}
        </div>
      )}

      {outcome.excludedRatingCount > 0 && (
        <p className="text-body-sm text-text-secondary">
          {outcome.excludedRatingCount} rating
          {outcome.excludedRatingCount === 1 ? " was" : "s were"} excluded from the valid
          aggregate because the value could not be resolved against the frozen instrument scale.
        </p>
      )}
    </div>
  );
}
