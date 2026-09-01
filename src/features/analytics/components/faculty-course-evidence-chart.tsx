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
  const highest = data.reduce((left, right) => (right.mean > left.mean ? right : left));
  const lowest = data.reduce((left, right) => (right.mean < left.mean ? right : left));

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
          {data.map((item, index) => {
            const minimum = item.scaleMin;
            const maximum = item.scaleMax;
            const width =
              minimum === null || maximum === null || maximum === minimum
                ? null
                : ((item.mean - minimum) / (maximum - minimum)) * 100;
            return (
              <div key={`${item.courseCode}-${item.scaleLabel}`} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold tabular-nums">{item.courseCode}</span>
                  <span className="text-label-sm font-semibold tabular-nums">
                    {item.mean.toFixed(2)} / {item.scaleMax ?? "—"}
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  {width === null ? (
                    <div className="bg-muted-foreground/30 h-full w-full rounded-full" />
                  ) : (
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${width}%`, background: chartFill(chartId, index) }}
                    />
                  )}
                </div>
                <p className="text-muted-foreground text-caption">
                  {item.responseCount} responses · {item.ratingCount} ratings · {item.scaleLabel}
                </p>
              </div>
            );
          })}
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
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 46, bottom: 8, left: 8 }}
          >
            <ChartPatternDefs chartId={chartId} categoryCount={data.length} />
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              domain={[
                Math.min(...data.map((item) => item.scaleMin ?? 0)),
                Math.max(...data.map((item) => item.scaleMax ?? item.mean)),
              ]}
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
                const payload = item.payload as FacultyCourseEvidence;
                return [
                  `${Number(value).toFixed(2)} · ${payload.responseCount} responses · ${payload.ratingCount} ratings`,
                  payload.scaleLabel,
                ];
              }}
            />
            <Bar dataKey="mean" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {data.map((item, index) => (
                <Cell
                  key={`${item.courseCode}-${item.scaleLabel}`}
                  fill={chartFill(chartId, index)}
                />
              ))}
              <LabelList
                dataKey="mean"
                position="right"
                formatter={(value) =>
                  typeof value === "number" ? value.toFixed(2) : String(value ?? "")
                }
              />
            </Bar>
          </BarChart>
        </ChartContainer>
        <p id={insightId} className="text-body-sm text-text-secondary">
          {data.length === 1
            ? `${data[0].courseCode} has a mean rating of ${data[0].mean.toFixed(2)} on its ${data[0].scaleLabel} scale.`
            : `Mean ratings range from ${lowest.courseCode} at ${lowest.mean.toFixed(2)} to ${highest.courseCode} at ${highest.mean.toFixed(2)}. Sample sizes and scales remain visible in the evidence list.`}
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
