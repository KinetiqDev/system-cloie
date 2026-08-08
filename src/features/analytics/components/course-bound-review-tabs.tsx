"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnonymizedResponseCards } from "@/features/analytics/components/anonymized-response-cards";
import { MeanBarChart } from "@/features/analytics/components/mean-bar-chart";
import { QualitativeWordCloud } from "@/features/analytics/components/qualitative-word-cloud";
import type { CourseBoundReviewDetail } from "@/features/analytics/types";

type CourseBoundReviewTabsProps = {
  detail: CourseBoundReviewDetail;
  responseBasePath: string;
};

function formatMean(value: number | null) {
  return value === null ? "N/A" : value.toFixed(2);
}

export function CourseBoundReviewTabs({ detail, responseBasePath }: CourseBoundReviewTabsProps) {
  const ciloMetrics = detail.ciloMetrics ?? [];

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList variant="line" aria-label="Course-bound review tabs">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="section-analytics">Section Analytics</TabsTrigger>
        <TabsTrigger value="cilo-analytics">CILO Analytics</TabsTrigger>
        <TabsTrigger value="responses">Responses</TabsTrigger>
        <TabsTrigger value="word-cloud">Word Cloud</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-border rounded-lg border p-3">
              <p className="text-text-muted text-xs tracking-wide uppercase">Responses</p>
              <p className="text-xl font-semibold">{detail.responseCount}</p>
            </div>
            <div className="border-border rounded-lg border p-3">
              <p className="text-text-muted text-xs tracking-wide uppercase">Overall Mean</p>
              <p className="text-xl font-semibold">{formatMean(detail.overallMean)}</p>
            </div>
            <div className="border-border rounded-lg border p-3">
              <p className="text-text-muted text-xs tracking-wide uppercase">Course</p>
              <p className="text-sm font-semibold">{detail.courseTitle}</p>
            </div>
            <div className="border-border rounded-lg border p-3">
              <p className="text-text-muted text-xs tracking-wide uppercase">Program</p>
              <p className="text-sm font-semibold">{detail.programLabel}</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="section-analytics" className="space-y-4">
        <MeanBarChart
          title="Section Means"
          data={detail.sections.map((section) => ({ label: section.name, value: section.mean }))}
        />
        {detail.sections.map((section) => (
          <MeanBarChart
            key={section.id}
            title={`${section.name} Question Means`}
            data={section.questions.map((question) => ({
              label: question.prompt,
              value: question.mean,
            }))}
          />
        ))}
      </TabsContent>

      <TabsContent value="cilo-analytics">
        <Card>
          <CardHeader>
            <CardTitle>CILO Mean Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ciloMetrics.length === 0 ? (
              <p className="text-text-muted text-sm">
                No CILO bindings were saved for this evaluation.
              </p>
            ) : (
              ciloMetrics.map((metric) => (
                <div
                  key={metric.bindingId}
                  className="border-border grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem]"
                >
                  <div>
                    <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">
                      {metric.ciloLabel}
                    </p>
                    <p className="text-text text-sm">{metric.ciloDescription}</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">
                      Bound Question
                    </p>
                    <p className="text-text text-sm">{metric.questionPrompt}</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">
                      Mean
                    </p>
                    <p className="text-xl font-semibold">{formatMean(metric.mean)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="responses">
        <AnonymizedResponseCards
          responses={detail.responseCards}
          responseBasePath={responseBasePath}
        />
      </TabsContent>

      <TabsContent value="word-cloud">
        <QualitativeWordCloud
          title="Qualitative Feedback"
          tokens={detail.wordCloudTokens}
          responseCount={detail.qualitativeItemCount}
        />
      </TabsContent>
    </Tabs>
  );
}
