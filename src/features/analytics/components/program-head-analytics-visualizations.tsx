"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProgramHeadComparisonChart as ComparisonChartComponent } from "./program-head-comparison-chart";
import type { ProgramHeadInstrumentBreakdownChart as InstrumentChartComponent } from "./program-head-instrument-breakdown-chart";
import type { ProgramHeadOutcomeRankingChart as OutcomeChartComponent } from "./program-head-outcome-ranking-chart";
import type { ProgramHeadResponseCompositionDonut as CompositionChartComponent } from "./program-head-response-composition-donut";
import type { ProgramHeadTrendChart as TrendChartComponent } from "./program-head-trend-chart";
import type { QualitativeWordCloud as WordCloudComponent } from "./qualitative-word-cloud";

function VisualizationFallback({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      <Skeleton aria-hidden="true" className="h-72 w-full rounded-xl" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export const ProgramHeadComparisonChart = dynamic<ComponentProps<typeof ComparisonChartComponent>>(
  () =>
    import("./program-head-comparison-chart").then((module) => module.ProgramHeadComparisonChart),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading comparison chart" />,
  }
);

export const ProgramHeadInstrumentBreakdownChart = dynamic<
  ComponentProps<typeof InstrumentChartComponent>
>(
  () =>
    import("./program-head-instrument-breakdown-chart").then(
      (module) => module.ProgramHeadInstrumentBreakdownChart
    ),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading instrument breakdown chart" />,
  }
);

export const ProgramHeadOutcomeRankingChart = dynamic<ComponentProps<typeof OutcomeChartComponent>>(
  () =>
    import("./program-head-outcome-ranking-chart").then(
      (module) => module.ProgramHeadOutcomeRankingChart
    ),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading outcome ranking chart" />,
  }
);

export const ProgramHeadResponseCompositionDonut = dynamic<
  ComponentProps<typeof CompositionChartComponent>
>(
  () =>
    import("./program-head-response-composition-donut").then(
      (module) => module.ProgramHeadResponseCompositionDonut
    ),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading response composition chart" />,
  }
);

export const ProgramHeadTrendChart = dynamic<ComponentProps<typeof TrendChartComponent>>(
  () => import("./program-head-trend-chart").then((module) => module.ProgramHeadTrendChart),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading trend chart" />,
  }
);

export const QualitativeWordCloud = dynamic<ComponentProps<typeof WordCloudComponent>>(
  () => import("./qualitative-word-cloud").then((module) => module.QualitativeWordCloud),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading qualitative word cloud" />,
  }
);
