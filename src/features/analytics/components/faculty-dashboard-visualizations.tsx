"use client";

import dynamic from "next/dynamic";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  qualitativeResponseCount,
  qualitativeEvaluationCount,
}: FacultyDashboardVisualizations) {
  return (
    <div className="space-y-6">
      <FacultyCourseEvidenceChart data={courseEvidence} />
      <section
        aria-labelledby="qualitative-insights-title"
        className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]"
      >
        <QualitativeWordCloud
          title="Qualitative feedback themes"
          tokens={wordCloudTokens}
          answerCount={qualitativeItemCount}
        />
        <Card>
          <CardHeader>
            <CardTitle id="qualitative-insights-title">Evidence and privacy</CardTitle>
            <CardDescription>What the word cloud represents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="text-body-sm grid grid-cols-2 gap-x-4 gap-y-3">
              <dt className="text-muted-foreground">Qualitative answers</dt>
              <dd className="text-right font-semibold tabular-nums">
                {qualitativeItemCount.toLocaleString()}
              </dd>
              <dt className="text-muted-foreground">Submitted responses</dt>
              <dd className="text-right font-semibold tabular-nums">
                {qualitativeResponseCount.toLocaleString()}
              </dd>
              <dt className="text-muted-foreground">Evaluations represented</dt>
              <dd className="text-right font-semibold tabular-nums">
                {qualitativeEvaluationCount.toLocaleString()}
              </dd>
            </dl>
            <div className="border-border bg-surface-muted rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck
                  aria-hidden="true"
                  className="text-muted-foreground mt-0.5 size-4 shrink-0"
                />
                <p className="text-muted-foreground text-body-sm">
                  Names, email addresses, and number-bearing identifiers are removed before terms
                  are counted. Faculty only receive aggregate, anonymized evidence.
                </p>
              </div>
            </div>
            <p className="text-muted-foreground text-body-sm">
              Word size reflects frequency. The Ranked view lists exact counts, and the Cloud view
              shows the shape of the most mentioned terms — neither changes the underlying evidence.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
