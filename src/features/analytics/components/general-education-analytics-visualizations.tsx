"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { AnalyticsChartSkeleton } from "./program-head-analytics-content-fallback";
import type { GeneralEducationAlignmentChart as AlignmentChartComponent } from "./general-education-trends-charts";
import type { GeneralEducationDistributionChart as DistributionChartComponent } from "./general-education-distribution-chart";
import type {
  GeneralEducationResponseRateTrendChart as ResponseRateTrendChartComponent,
  GeneralEducationTrendChart as TrendChartComponent,
} from "./general-education-trends-charts";
import type { GeneralEducationResponseRateChart as ResponseRateChartComponent } from "./general-education-response-rate-chart";
import type { GeneralEducationScaleMeanChart as ScaleMeanChartComponent } from "./general-education-scale-mean-chart";
import type { OutcomeMeanBarChart as OutcomeMeanBarChartComponent } from "./outcome-mean-bar-chart";
import type { QualitativeWordCloud as WordCloudComponent } from "./qualitative-word-cloud";
/**
 * Charts are the only client boundary in this workspace, and every one is
 * loaded from here so Recharts stays out of the route's initial payload.
 * `ssr: false` defers each chart past server rendering; it does not wait for
 * scroll — a mounted chart chunk loads on mount, behind its skeleton.
 */
function VisualizationFallback({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      <AnalyticsChartSkeleton />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export const LazyOutcomeMeanBarChart = dynamic<ComponentProps<typeof OutcomeMeanBarChartComponent>>(
  () => import("./outcome-mean-bar-chart").then((module) => module.OutcomeMeanBarChart),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading outcome chart" />,
  }
);

export const LazyGeneralEducationDistributionChart = dynamic<
  ComponentProps<typeof DistributionChartComponent>
>(
  () =>
    import("./general-education-distribution-chart").then(
      (module) => module.GeneralEducationDistributionChart
    ),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading Likert distribution chart" />,
  }
);

export const LazyGeneralEducationAlignmentChart = dynamic<
  ComponentProps<typeof AlignmentChartComponent>
>(
  () =>
    import("./general-education-trends-charts").then(
      (module) => module.GeneralEducationAlignmentChart
    ),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading ILO alignment chart" />,
  }
);

export const LazyGeneralEducationTrendChart = dynamic<ComponentProps<typeof TrendChartComponent>>(
  () =>
    import("./general-education-trends-charts").then((module) => module.GeneralEducationTrendChart),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading mean rating trend chart" />,
  }
);

export const LazyGeneralEducationResponseRateTrendChart = dynamic<
  ComponentProps<typeof ResponseRateTrendChartComponent>
>(
  () =>
    import("./general-education-trends-charts").then(
      (module) => module.GeneralEducationResponseRateTrendChart
    ),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading response rate chart" />,
  }
);

export const LazyGeneralEducationResponseRateChart = dynamic<
  ComponentProps<typeof ResponseRateChartComponent>
>(
  () =>
    import("./general-education-response-rate-chart").then(
      (module) => module.GeneralEducationResponseRateChart
    ),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading response rate chart" />,
  }
);

export const LazyGeneralEducationScaleMeanChart = dynamic<
  ComponentProps<typeof ScaleMeanChartComponent>
>(
  () =>
    import("./general-education-scale-mean-chart").then(
      (module) => module.GeneralEducationScaleMeanChart
    ),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading mean rating chart" />,
  }
);

export const LazyQualitativeWordCloud = dynamic<ComponentProps<typeof WordCloudComponent>>(
  () => import("./qualitative-word-cloud").then((module) => module.QualitativeWordCloud),
  {
    ssr: false,
    loading: () => <VisualizationFallback label="Loading qualitative word cloud" />,
  }
);
