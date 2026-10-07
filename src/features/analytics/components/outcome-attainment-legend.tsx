import { useId } from "react";
import { ChartSwatch } from "@/components/ui/chart";
import { ATTAINMENT_PRESENTATION } from "./outcome-attainment-badge";

const bands = [
  { interpretation: "Fully Attained", range: "4.50 ≤ mean ≤ 5.00", cqi: "Meets Benchmark" },
  { interpretation: "Attained", range: "3.50 ≤ mean < 4.50", cqi: "Meets Benchmark" },
  { interpretation: "Partially Attained", range: "2.50 ≤ mean < 3.50", cqi: "Needs Attention" },
  { interpretation: "Slightly Attained", range: "1.50 ≤ mean < 2.50", cqi: "Below Benchmark" },
  { interpretation: "Not Attained", range: "1.00 ≤ mean < 1.50", cqi: "Below Benchmark" },
] as const;

export function AttainmentLegend() {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3">
      <h3 id={titleId} className="text-title-sm">
        Attainment interpretation guide
      </h3>
      <ul
        aria-label="Attainment colors and mean ranges"
        className="grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {bands.map((band) => {
          const presentation = ATTAINMENT_PRESENTATION[band.cqi];
          return (
            <li key={band.interpretation} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1 shrink-0">
                <ChartSwatch fill={presentation.color} />
              </span>
              <div className="text-body-sm min-w-0">
                <p className="font-medium">{band.interpretation}</p>
                <p className="text-text-secondary tabular-nums">{band.range}</p>
                <p className="text-text-secondary">
                  {presentation.colorName}: {band.cqi}
                </p>
              </div>
            </li>
          );
        })}
        <li className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-1 shrink-0">
            <ChartSwatch fill="var(--text-muted)" />
          </span>
          <div className="text-body-sm min-w-0">
            <p className="font-medium">Not classified</p>
            <p className="text-text-secondary">
              Gray: No evidence, unsupported scale, or mixed scales. These are not non-attainment.
            </p>
          </div>
        </li>
      </ul>
      <p className="text-body-sm text-text-secondary">
        Proposed institutional policy. Benchmark 3.50 applies only to CILO and PO means on approved
        five-point scales. Classification uses full-precision means before display rounding.
        Agreement and performance surveys describe perceived attainment, not demonstrated
        competency.
      </p>
    </section>
  );
}
