"use client";

import dynamic from "next/dynamic";
import type { FacultyDashboardVisualizations } from "@/features/analytics/services/get-faculty-dashboard";
import {
  CourseMeanPieChartFallback,
  QualitativeWordCloudFallback,
} from "./faculty-dashboard-visualization-fallbacks";

const CourseMeanPieChart = dynamic(
  () => import("./course-mean-pie-chart").then((module) => module.CourseMeanPieChart),
  { ssr: false, loading: CourseMeanPieChartFallback }
);

const QualitativeWordCloud = dynamic(
  () => import("./qualitative-word-cloud").then((module) => module.QualitativeWordCloud),
  { ssr: false, loading: QualitativeWordCloudFallback }
);

export function FacultyDashboardVisualizations({
  courseMeans,
  wordCloudTokens,
}: FacultyDashboardVisualizations) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <CourseMeanPieChart data={courseMeans} />
      <QualitativeWordCloud title="Qualitative Response Insights" tokens={wordCloudTokens} />
    </div>
  );
}
