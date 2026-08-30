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
import type { FacultyAnalyticsData } from "../types";

type FacultyCiloAnalyticsChartProps = {
  data: FacultyAnalyticsData[];
};

export function FacultyCiloAnalyticsChart({ data }: FacultyCiloAnalyticsChartProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `cilo-mean-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;
  // Aggregate CILO metrics across all evaluations
  const ciloMap = new Map<string, { label: string; description: string; values: number[] }>();

  for (const evalData of data) {
    for (const cilo of evalData.ciloMetrics) {
      const key = cilo.ciloId || cilo.bindingId;
      if (!ciloMap.has(key)) {
        ciloMap.set(key, {
          label: cilo.ciloLabel,
          description: cilo.ciloDescription,
          values: [],
        });
      }
      const entry = ciloMap.get(key)!;
      if (cilo.mean !== null && cilo.responseCount > 0) {
        // Weight by response count
        for (let i = 0; i < cilo.responseCount; i++) {
          entry.values.push(cilo.mean);
        }
      }
    }
  }

  const chartData = Array.from(ciloMap.entries())
    .map(([key, value]) => {
      const mean =
        value.values.length > 0 ? value.values.reduce((a, b) => a + b, 0) / value.values.length : 0;
      return {
        name: value.label,
        key,
        value: parseFloat(mean.toFixed(2)),
        description: value.description,
      };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">CILO Mean Attainment</CardTitle>
          <CardDescription>No CILO data available</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="h-64">
            <EmptyTitle>No CILO data yet</EmptyTitle>
            <EmptyDescription>No CILO-bound quantitative responses yet.</EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const config = Object.fromEntries(
    chartData.map((item) => [item.name, { label: `${item.name} (${item.value})` }])
  );

  const best = chartData[0];
  const worst = chartData[chartData.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle id={titleId} className="text-title-sm">
          CILO Mean Attainment
        </CardTitle>
        <CardDescription>Mean scores per Course Intended Learning Outcome</CardDescription>
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
            <ChartPatternDefs chartId={chartId} categoryCount={chartData.length} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={50}
              paddingAngle={3}
              isAnimationActive={false}
              label={({ name, value }: PieLabelRenderProps) => `${name}: ${value}`}
              labelLine
            >
              {chartData.map((item, index) => (
                <Cell key={`cell-${index}`} fill={chartFill(chartId, index)} />
              ))}
            </Pie>
            <ChartTooltip
              formatter={(value, name) => {
                const item = chartData.find((d) => d.name === name);
                return [`Mean: ${value}`, item?.description || name];
              }}
            />
            <ChartLegend verticalAlign="bottom" content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
        <p id={insightId} className="text-body-sm text-text-secondary">
          {chartData.length === 1
            ? `Mean attainment for ${best.name}: ${best.value}.`
            : `Highest attainment: ${best.name} (${best.value}). Lowest attainment: ${worst.name} (${worst.value}).`}
        </p>
        <details>
          <summary className="text-label-sm text-text-secondary cursor-pointer">
            View exact values
          </summary>
          <div className="border-border mt-3 overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Intended Learning Outcome</TableHead>
                  <TableHead className="text-right">Mean</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map((item) => (
                  <TableRow key={item.key}>
                    <TableCell className="max-w-md truncate font-medium">{item.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.value}</TableCell>
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
