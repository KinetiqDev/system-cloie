"use client";

import { useId } from "react";
import type { PieLabelRenderProps } from "recharts";
import { PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartPatternDefs,
  ChartTooltip,
  chartFill,
} from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CourseMeanData = {
  courseCode: string;
  courseTitle: string;
  mean: number;
  responseCount: number;
};

type CourseMeanPieChartProps = {
  data: CourseMeanData[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CourseMeanPieChart({ data }: CourseMeanPieChartProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `course-mean-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">Overall Mean by Course</CardTitle>
          <CardDescription>Quantitative mean scores grouped by course</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="h-64">
            <EmptyTitle>No course data yet</EmptyTitle>
            <EmptyDescription>No quantitative response data available yet.</EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const config = Object.fromEntries(
    data.map((item) => [
      item.courseCode,
      { label: `${item.courseCode} — ${item.courseTitle} (${item.responseCount} responses)` },
    ])
  );

  const best = data.reduce((a, b) => (b.mean > a.mean ? b : a));
  const worst = data.reduce((a, b) => (b.mean < a.mean ? b : a));

  return (
    <Card>
      <CardHeader>
        <CardTitle id={titleId} className="text-title-sm">
          Overall Mean by Course
        </CardTitle>
        <CardDescription>Quantitative mean scores grouped by course</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ChartContainer
          id={chartId}
          role="region"
          aria-labelledby={titleId}
          aria-describedby={insightId}
          config={config}
          className="aspect-auto h-80 w-full"
        >
          <PieChart>
            <ChartPatternDefs chartId={chartId} categoryCount={data.length} />
            <Pie
              data={data}
              dataKey="mean"
              nameKey="courseCode"
              cx="50%"
              cy="50%"
              outerRadius={110}
              innerRadius={50}
              paddingAngle={3}
              isAnimationActive={false}
              label={({ name, value }: PieLabelRenderProps) => `${name}: ${value}`}
              labelLine
            >
              {data.map((item, index) => (
                <Cell key={`cell-${index}`} fill={chartFill(chartId, index)} />
              ))}
            </Pie>
            <ChartTooltip formatter={(value, name) => [`Mean: ${value}`, name]} />
            <ChartLegend
              verticalAlign="bottom"
              content={<ChartLegendContent nameKey="courseCode" />}
            />
          </PieChart>
        </ChartContainer>
        <p id={insightId} className="text-body-sm text-text-secondary">
          {data.length === 1
            ? `Mean for ${data[0].courseCode}: ${data[0].mean.toFixed(2)}.`
            : `Highest mean: ${best.courseCode} (${best.mean.toFixed(2)}). Lowest mean: ${worst.courseCode} (${worst.mean.toFixed(2)}).`}
        </p>
        <details>
          <summary className="text-label-sm text-text-secondary cursor-pointer">
            View exact values
          </summary>
          <div className="border-border mt-3 overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Mean</TableHead>
                  <TableHead className="text-right">Responses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.courseCode}>
                    <TableCell className="font-medium">{item.courseCode}</TableCell>
                    <TableCell className="max-w-md truncate">{item.courseTitle}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.mean.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.responseCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
