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

type StakeholderMeanData = {
  label: string;
  mean: number;
  responseCount: number;
};

type StakeholderMeanPieChartProps = {
  data: StakeholderMeanData[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StakeholderMeanPieChart({ data }: StakeholderMeanPieChartProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `stakeholder-mean-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">Overall Mean by Stakeholder</CardTitle>
          <CardDescription>Quantitative mean scores grouped by respondent type</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="h-64">
            <EmptyTitle>No stakeholder data yet</EmptyTitle>
            <EmptyDescription>No quantitative response data available yet.</EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const config = Object.fromEntries(
    data.map((item) => [item.label, { label: `${item.label} (${item.responseCount} responses)` }])
  );

  const best = data.reduce((a, b) => (b.mean > a.mean ? b : a));
  const worst = data.reduce((a, b) => (b.mean < a.mean ? b : a));

  return (
    <Card>
      <CardHeader>
        <CardTitle id={titleId} className="text-title-sm">
          Overall Mean by Stakeholder
        </CardTitle>
        <CardDescription>Quantitative mean scores grouped by respondent type</CardDescription>
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
              nameKey="label"
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
            <ChartTooltip
              formatter={(value, name) => [`Mean: ${value}`, name]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                fontSize: "13px",
              }}
            />
            <ChartLegend verticalAlign="bottom" content={<ChartLegendContent nameKey="label" />} />
          </PieChart>
        </ChartContainer>
        <p id={insightId} className="text-body-sm text-text-secondary">
          {data.length === 1
            ? `Mean for ${data[0].label}: ${data[0].mean.toFixed(2)}.`
            : `Highest mean: ${best.label} (${best.mean.toFixed(2)}). Lowest mean: ${worst.label} (${worst.mean.toFixed(2)}).`}
        </p>
        <details>
          <summary className="text-label-sm text-text-secondary cursor-pointer">
            View exact values
          </summary>
          <div className="border-border mt-3 overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stakeholder</TableHead>
                  <TableHead className="text-right">Mean</TableHead>
                  <TableHead className="text-right">Responses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.label}>
                    <TableCell className="font-medium">{item.label}</TableCell>
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
