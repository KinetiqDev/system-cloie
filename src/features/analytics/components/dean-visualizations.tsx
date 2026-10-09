"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { AnalyticsChartSkeleton } from "./program-head-analytics-content-fallback";
import type {
  DeanShareChart as ShareChartComponent,
  DeanTrendChart as TrendChartComponent,
  DeanValueChart as ValueChartComponent,
} from "./dean-charts";

function Fallback({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      <AnalyticsChartSkeleton />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export const LazyDeanShareChart = dynamic<ComponentProps<typeof ShareChartComponent>>(
  () => import("./dean-charts").then((module) => module.DeanShareChart),
  { ssr: false, loading: () => <Fallback label="Loading chart" /> }
);

export const LazyDeanValueChart = dynamic<ComponentProps<typeof ValueChartComponent>>(
  () => import("./dean-charts").then((module) => module.DeanValueChart),
  { ssr: false, loading: () => <Fallback label="Loading chart" /> }
);

export const LazyDeanTrendChart = dynamic<ComponentProps<typeof TrendChartComponent>>(
  () => import("./dean-charts").then((module) => module.DeanTrendChart),
  { ssr: false, loading: () => <Fallback label="Loading chart" /> }
);
