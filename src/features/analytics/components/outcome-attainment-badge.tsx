"use client";

import { Badge } from "@/components/ui/badge";
import type { OutcomeAttainment } from "../aggregators/outcome-attainment";
import { OUTCOME_ATTAINMENT_BENCHMARK } from "../aggregators/outcome-attainment";
import { cn } from "@/lib/utils";

/**
 * Deterministic attainment label for one classified CILO or PO mean.
 * Status is never communicated through color alone: every badge pairs an
 * icon-free text label with a semantic variant, and screen readers hear the
 * full interpretation plus the benchmark context.
 */
export function AttainmentBadge({
  attainment,
  className,
  compact = false,
}: {
  attainment: OutcomeAttainment | undefined;
  className?: string;
  compact?: boolean;
}) {
  if (!attainment || attainment.status !== "classified" || !attainment.interpretation) {
    return <AttainmentEmpty attainment={attainment} className={className} compact={compact} />;
  }
  const variant =
    attainment.cqi === "Meets Benchmark"
      ? "success"
      : attainment.cqi === "Needs Attention"
        ? "warning"
        : "destructive";
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <Badge variant={variant}>{attainment.interpretation}</Badge>
      {!compact && (
        <span className="text-label-sm text-muted-foreground font-medium">{attainment.cqi}</span>
      )}
      <span className="sr-only">
        {`Mean classified as ${attainment.interpretation}, ${attainment.cqi}, benchmark ${OUTCOME_ATTAINMENT_BENCHMARK.toFixed(2)}`}
      </span>
    </span>
  );
}

function AttainmentEmpty({
  attainment,
  className,
}: {
  attainment: OutcomeAttainment | undefined;
  className?: string;
  compact?: boolean;
}) {
  let text = "No evidence";
  let sr = "No valid ratings for this outcome in the selected scope, so no attainment is reported";
  if (attainment?.status === "mixed-scales") {
    text = "Mixed scales";
    sr = "Evidence spans incompatible rating scales, so no combined attainment is reported";
  } else if (attainment?.status === "unsupported-scale") {
    text = "Unsupported scale";
    sr =
      "The frozen rating scale does not match a compatible five-point outcome scale, so no attainment is reported";
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Badge variant="outline">{text}</Badge>
      <span className="sr-only">{sr}</span>
    </span>
  );
}

/**
 * 3-tier canonical color fill for outcome attainment charts and indicators:
 * - Meets Benchmark: var(--color-success) (#047857)
 * - Needs Attention: var(--color-warning) (#b45309)
 * - Below Benchmark: var(--color-danger) (#b91c1c)
 * - Unclassified / Descriptive: defaultColor (defaults to var(--chart-1))
 */
export function getAttainmentColor(
  attainment?: OutcomeAttainment,
  defaultColor = "var(--chart-1)"
): string {
  if (!attainment || attainment.status !== "classified") {
    return defaultColor;
  }
  switch (attainment.cqi) {
    case "Meets Benchmark":
      return "var(--color-success)";
    case "Needs Attention":
      return "var(--color-warning)";
    case "Below Benchmark":
      return "var(--color-danger)";
    default:
      return defaultColor;
  }
}
