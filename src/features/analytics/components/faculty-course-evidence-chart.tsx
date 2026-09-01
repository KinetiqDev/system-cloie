"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartPatternDefs, ChartTooltip, chartFill } from "@/components/ui/chart";
import type { FacultyCourseEvidence } from "@/features/analytics/services/get-faculty-dashboard";

export function FacultyCourseEvidenceChart({ data }: { data: FacultyCourseEvidence[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course rating evidence</CardTitle>
          <CardDescription>Submitted ratings for the active academic period</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="min-h-72">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3 aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No quantitative evidence yet</EmptyTitle>
              <EmptyDescription>
                Publish an evaluation and collect submitted responses to compare course ratings
                here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" render={<Link href="/faculty/tools?tab=published" />}>
                Open evaluation tools
              </Button>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const chartId = "faculty-course-evidence";
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;
  const height = Math.max(280, data.length * 64);
  const config = Object.fromEntries(
    data.map((item) => [item.courseCode, { label: `${item.courseCode} — ${item.courseTitle}` }])
  );
  // Normalize each mean to its own scale range so incompatible scales compare fairly:
  // a 4/5 mean (80% of its scale) outranks a 5/7 mean (71% of its scale) without
  // claiming the raw values are comparable. The evidence list keeps the raw mean and scale.
  const chartData = data
    .map((item) => {
      const scaleMin = item.scaleMin;
      const scaleMax = item.scaleMax;
      const percentage =
        scaleMin !== null && scaleMax !== null && scaleMax > scaleMin
          ? ((item.mean - scaleMin) / (scaleMax - scaleMin)) * 100
          : null;
      return {
        ...item,
        percentage,
        label: `${item.mean.toFixed(2)} · ${item.scaleLabel}`,
      };
    })
    .sort(
      (left, right) =>
        (left.percentage ?? -1) - (right.percentage ?? -1) ||
        left.courseCode.localeCompare(right.courseCode)
    );
  const highest = chartData.reduce((left, right) =>
    (right.percentage ?? -1) > (left.percentage ?? -1) ? right : left
  );
  const lowest = chartData.reduce((left, right) =>
    (right.percentage ?? -1) < (left.percentage ?? -1) ? right : left
  );

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle id={titleId}>Course rating evidence</CardTitle>
        <CardDescription>
          Mean ratings by course, sorted from lowest to highest. Each row keeps its rating scale
          separate.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:hidden" role="img" aria-label="Mean rating by course">
          {/* Mobile bars mirror the desktop chart with an indeterminate bar when the scale is unresolved. */}
          {/* fallow-ignore-next-line complexity */}
          {chartData.map((item, index) => (
            <div key={`${item.courseCode}-${item.scaleLabel}`} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold tabular-nums">{item.courseCode}</span>
                <span className="text-label-sm font-semibold tabular-nums">
                  {item.mean.toFixed(2)} / {item.scaleMax ?? "—"}
                </span>
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                {item.percentage === null ? (
                  <div className="bg-muted-foreground/30 h-full w-full rounded-full" />
                ) : (
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.percentage}%`, background: chartFill(chartId, index) }}
                  />
                )}
              </div>
              <p className="text-muted-foreground text-caption">
                {item.responseCount} responses · {item.ratingCount} ratings · {item.scaleLabel}
              </p>
            </div>
          ))}
        </div>
        <ChartContainer
          id={chartId}
          role="region"
          aria-labelledby={titleId}
          aria-describedby={insightId}
          config={config}
          className="hidden aspect-auto w-full sm:flex"
          style={{ height }}
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 64, bottom: 8, left: 8 }}
          >
            <ChartPatternDefs chartId={chartId} categoryCount={chartData.length} />
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="courseCode"
              width={62}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              formatter={(value, _name, item) => {
                const payload = item.payload as FacultyCourseEvidence & {
                  percentage: number | null;
                };
                const position =
                  payload.percentage === null
                    ? "Scale unavailable"
                    : `${payload.percentage.toFixed(0)}% of scale`;
                return [
                  `${payload.mean.toFixed(2)} · ${payload.responseCount} responses · ${payload.ratingCount} ratings · ${position}`,
                  payload.scaleLabel,
                ];
              }}
            />
            <Bar dataKey="percentage" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {chartData.map((item, index) => (
                <Cell
                  key={`${item.courseCode}-${item.scaleLabel}`}
                  fill={chartFill(chartId, index)}
                />
              ))}
              <LabelList
                dataKey="label"
                position="right"
                formatter={(value) => (typeof value === "string" ? value : String(value ?? ""))}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
        <p id={insightId} className="text-body-sm text-text-secondary">
          {chartData.length === 1
            ? `${chartData[0].courseCode} has a mean rating of ${chartData[0].mean.toFixed(2)} on its ${chartData[0].scaleLabel} scale.`
            : `Bars are normalized to each course's own scale, so ${lowest.courseCode} ranks lowest and ${highest.courseCode} highest. Raw means and scales stay visible in the evidence list.`}
        </p>
        <div
          role="list"
          className="border-border divide-border divide-y rounded-lg border"
          aria-label="Course evidence details"
        >
          {data.map((item) => (
            <div
              role="listitem"
              key={`${item.courseCode}-${item.scaleLabel}`}
              className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  <span className="tabular-nums">{item.courseCode}</span> ·{" "}
                  <span className="break-words">{item.courseTitle}</span>
                </p>
                <p className="text-muted-foreground text-body-sm">
                  {item.responseCount.toLocaleString()} submitted responses ·{" "}
                  {item.ratingCount.toLocaleString()} ratings · {item.scaleLabel}
                </p>
              </div>
              <Link
                href={item.evidenceHref}
                className="text-link text-label-sm min-h-11 self-start py-3 font-semibold underline-offset-4 hover:underline sm:self-center"
              >
                View evidence
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
