"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { MetricEvidenceSummary } from "@/features/analytics/aggregators/types";

/**
 * "How calculated" disclosure for a major metric (spec §41). Renders the
 * plain-language explanation plus any available presentation counts, scale
 * label, and an evidence link. Pure presentation metadata — there is no
 * trace table behind it.
 */
export function HowCalculatedPopover({
  metric,
  label,
}: {
  metric: MetricEvidenceSummary;
  /** Human label of the metric, used for the trigger's accessible name. */
  label: string;
}) {
  const countRows: Array<{ label: string; value: number }> = [];
  if (metric.ratingCount !== undefined)
    countRows.push({ label: "Ratings", value: metric.ratingCount });
  if (metric.responseCount !== undefined)
    countRows.push({ label: "Responses", value: metric.responseCount });
  if (metric.assignmentCount !== undefined)
    countRows.push({ label: "Assignments", value: metric.assignmentCount });
  if (metric.evaluationCount !== undefined)
    countRows.push({ label: "Evaluations", value: metric.evaluationCount });
  if (metric.questionCount !== undefined)
    countRows.push({ label: "Questions", value: metric.questionCount });

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`How calculated: ${label}`}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none pointer-coarse:size-11"
          >
            <Info aria-hidden="true" className="size-4" />
          </button>
        }
      />
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>How {label.toLowerCase()} is calculated</PopoverTitle>
          <PopoverDescription>{metric.explanation}</PopoverDescription>
        </PopoverHeader>
        {metric.scaleLabel && (
          <p className="text-muted-foreground text-label-sm">
            Scale: <span className="text-foreground font-medium">{metric.scaleLabel}</span>
          </p>
        )}
        {countRows.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {countRows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-semibold tabular-nums">{row.value.toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        )}
        {metric.evidenceHref && (
          <Link
            href={metric.evidenceHref}
            className="text-link text-label-sm font-semibold underline-offset-4 hover:underline"
          >
            View underlying evidence
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}
