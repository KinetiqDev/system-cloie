"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartPatternDefs,
  ChartSwatch,
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

type StakeholderMeanComparisonData = {
  label: string;
  /** Full-precision mean rating; formatted at presentation. */
  mean: number;
  responseCount: number;
};

type StakeholderMeanComparisonProps = {
  data: StakeholderMeanComparisonData[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Compact comparison of independent stakeholder Mean Ratings. Independent means
 * are ranked horizontal bars with exact value labels — never pie slices, which
 * would imply the means are parts of one whole.
 */
export function StakeholderMeanComparison({ data }: StakeholderMeanComparisonProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `stakeholder-mean-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle id={titleId} className="text-title-sm">
            Mean Rating by Stakeholder
          </CardTitle>
          <CardDescription>
            Quantitative mean ratings from central deployment evidence, grouped by respondent type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="h-64">
            <EmptyTitle>No stakeholder data yet</EmptyTitle>
            <EmptyDescription>No central deployment response data available yet.</EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const ranked = [...data].sort((a, b) => b.mean - a.mean);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle id={titleId} className="text-title-sm">
          Mean Rating by Stakeholder
        </CardTitle>
        <CardDescription>
          Quantitative mean ratings from central deployment evidence, grouped by respondent type
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="border-border h-80 w-full rounded-xl border p-3">
          <ChartContainer
            id={chartId}
            role="region"
            aria-labelledby={titleId}
            aria-describedby={insightId}
            className="aspect-auto h-full w-full"
          >
            <BarChart
              data={ranked}
              layout="vertical"
              margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <ChartPatternDefs chartId={chartId} categoryCount={ranked.length} />
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, (dataMax: number) => dataMax * 1.15]}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => value.toFixed(1)}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={128}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                formatter={(value, _name, item) => {
                  const original = (item?.payload as StakeholderMeanComparisonData | undefined)
                    ?.mean;
                  const responses = (item?.payload as StakeholderMeanComparisonData | undefined)
                    ?.responseCount;
                  return [
                    `${original == null ? "N/A" : original.toFixed(2)} · ${responses ?? 0} ${
                      responses === 1 ? "response" : "responses"
                    }`,
                    "Mean Rating",
                  ];
                }}
              />
              <Bar dataKey="mean" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                {ranked.map((item, index) => (
                  <Cell key={`${item.label}-${index}`} fill={chartFill(chartId, index)} />
                ))}
                <LabelList
                  dataKey="mean"
                  position="right"
                  formatter={(value) => Number(value).toFixed(2)}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
        <div
          role="list"
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
          aria-label="Chart legend"
        >
          {ranked.map((item, index) => (
            <span role="listitem" key={item.label} className="flex items-center gap-1.5">
              <ChartSwatch fill={chartFill(chartId, index)} />
              <span className="text-muted-foreground text-xs">
                {item.label} ({item.responseCount}{" "}
                {item.responseCount === 1 ? "response" : "responses"})
              </span>
            </span>
          ))}
        </div>
        <p id={insightId} className="text-body-sm text-text-secondary">
          {data.length === 1
            ? `Mean Rating for ${data[0].label}: ${data[0].mean.toFixed(2)}.`
            : `Highest Mean Rating: ${best.label} (${best.mean.toFixed(2)}). Lowest Mean Rating: ${worst.label} (${worst.mean.toFixed(2)}).`}
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
                  <TableHead className="text-right">Mean Rating</TableHead>
                  <TableHead className="text-right">Responses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranked.map((item) => (
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
