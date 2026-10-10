import { Badge } from "@/components/ui/badge";
import type {
  OutcomeAttainment,
  OutcomeCqiClassification,
} from "../aggregators/outcome-attainment";
import { OUTCOME_ATTAINMENT_BENCHMARK } from "../aggregators/outcome-attainment";
import { cn } from "@/lib/utils";

export const ATTAINMENT_PRESENTATION = {
  "Meets Benchmark": { variant: "success", color: "var(--color-success)", colorName: "Green" },
  "Needs Attention": { variant: "warning", color: "var(--color-warning)", colorName: "Amber" },
  "Below Benchmark": { variant: "destructive", color: "var(--color-danger)", colorName: "Red" },
} as const satisfies Record<
  OutcomeCqiClassification,
  { variant: string; color: string; colorName: string }
>;

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
  const variant = attainment.cqi ? ATTAINMENT_PRESENTATION[attainment.cqi].variant : "outline";
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

export function getAttainmentColor(attainment?: OutcomeAttainment): string {
  return attainment?.status === "classified" && attainment.cqi
    ? ATTAINMENT_PRESENTATION[attainment.cqi].color
    : "var(--text-muted)";
}
