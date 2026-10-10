import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The thin-sample threshold counts respondents, not rating items: one response
 * can contribute many ratings, so a row built from five ratings may still rest
 * on a single respondent.
 */
export const LOW_SAMPLE_RESPONSES = 5;

/**
 * Thin-sample marker over distinct submitted responses. Text, never
 * color-only, and never a suppression — the evidence stays visible with its
 * limitation attached.
 */
export function LowSampleMarker({ responseCount }: { responseCount: number }) {
  return (
    <span className="text-label-sm text-warning inline-flex items-center gap-1">
      <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="tabular-nums">
        Thin sample: {responseCount} submitted {responseCount === 1 ? "response" : "responses"}
      </span>
    </span>
  );
}

/**
 * Distribution groups carry rating counts but no respondent count, so they say
 * exactly that rather than borrowing the respondents' threshold language.
 */
export function FewRatingsMarker({ ratingCount }: { ratingCount: number }) {
  return (
    <span className="text-label-sm text-warning inline-flex items-center gap-1">
      <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="tabular-nums">
        Few ratings: {ratingCount} valid {ratingCount === 1 ? "rating" : "ratings"}
      </span>
    </span>
  );
}

/** Neutral chip used for course/outcome codes inside dense matrix cells. */
export function CodeChip({ children }: { children: ReactNode }) {
  return (
    <span className="border-border bg-muted/50 text-text-secondary text-label-sm rounded-md border px-2 py-0.5 whitespace-nowrap">
      {children}
    </span>
  );
}

/** Consistent em-dash for an unavailable number across every exact table. */
export function MissingValue() {
  return <span className="text-text-secondary">—</span>;
}
