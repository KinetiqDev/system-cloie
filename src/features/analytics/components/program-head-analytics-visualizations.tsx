"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { AnalyticsChartSkeleton } from "./program-head-analytics-content-fallback";
import type { ProgramHeadComparisonChart as ComparisonChartComponent } from "./program-head-comparison-chart";
import type { ProgramHeadInstrumentBreakdownChart as InstrumentChartComponent } from "./program-head-instrument-breakdown-chart";
import type { ProgramHeadPloLollipopChart as LollipopChartComponent } from "./program-head-plo-lollipop-chart";
import type { ProgramHeadTrendChart as TrendChartComponent } from "./program-head-trend-chart";
import type { QualitativeWordCloud as WordCloudComponent } from "./qualitative-word-cloud";

function VisualizationFallback({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      <AnalyticsChartSkeleton />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export const LazyProgramHeadComparisonChart = dynamic<
  ComponentProps<typeof ComparisonChartComponent>
>(
  () =>
    import("./program-head-comparison-chart").then((module) => module.ProgramHeadComparisonChart),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading comparison chart" />,
  }
);

export const LazyProgramHeadInstrumentBreakdownChart = dynamic<
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

export const LazyProgramHeadPloLollipopChart = dynamic<
  ComponentProps<typeof LollipopChartComponent>
>(
  () =>
    import("./program-head-plo-lollipop-chart").then(
      (module) => module.ProgramHeadPloLollipopChart
    ),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading outcome chart" />,
  }
);

export const LazyProgramHeadTrendChart = dynamic<ComponentProps<typeof TrendChartComponent>>(
  () => import("./program-head-trend-chart").then((module) => module.ProgramHeadTrendChart),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading trend chart" />,
  }
);

export const LazyQualitativeWordCloud = dynamic<ComponentProps<typeof WordCloudComponent>>(
  () => import("./qualitative-word-cloud").then((module) => module.QualitativeWordCloud),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading qualitative word cloud" />,
  }
);
