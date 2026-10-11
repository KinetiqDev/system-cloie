"use client";

import dynamic from "next/dynamic";
import type { FacultyDashboardVisualizations } from "@/features/analytics/services/get-faculty-dashboard";
import {
  CourseMeanPieChartFallback,
  QualitativeWordCloudFallback,
} from "./faculty-dashboard-visualization-fallbacks";

const FacultyCourseEvidenceChart = dynamic(
  () =>
    import("./faculty-course-evidence-chart").then((module) => module.FacultyCourseEvidenceChart),
  { ssr: false, loading: CourseMeanPieChartFallback }
);

const QualitativeWordCloud = dynamic(
  () => import("./qualitative-word-cloud").then((module) => module.QualitativeWordCloud),
  { ssr: false, loading: QualitativeWordCloudFallback }
);

export function FacultyDashboardVisualizations({
  courseEvidence,
  wordCloudTokens,
  qualitativeItemCount,
}: FacultyDashboardVisualizations) {
  return (
    <div className="space-y-6">
      <FacultyCourseEvidenceChart data={courseEvidence} />
      <QualitativeWordCloud
        title="Qualitative feedback themes"
        tokens={wordCloudTokens}
        answerCount={qualitativeItemCount}
      />
    </div>
  );
}
