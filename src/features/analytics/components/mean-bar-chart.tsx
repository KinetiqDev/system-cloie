"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartPatternDefs, ChartSwatch, chartFill } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MeanDatum = {
  label: string;
  value: number | null;
};

type MeanBarChartProps = {
  title: string;
  data: MeanDatum[];
};

export function MeanBarChart({ title, data }: MeanBarChartProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `mean-bar-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;

  const chartData = data.map((entry) => ({ ...entry, chartValue: entry.value ?? 0 }));

  const ranked = data.filter((entry) => entry.value !== null).sort((a, b) => b.value! - a.value!);

  if (ranked.length === 0) {
    return (
      <div className="space-y-3">
        <h3 id={titleId} className="text-title-sm text-foreground">
          {title}
        </h3>
        <Empty className="h-72">
          <EmptyTitle>No mean data yet</EmptyTitle>
          <EmptyDescription>No mean data available.</EmptyDescription>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 id={titleId} className="text-title-sm text-foreground">
        {title}
      </h3>
      <div className="border-border h-72 w-full rounded-xl border p-3">
        <ChartContainer
          id={chartId}
          role="region"
          aria-labelledby={titleId}
          aria-describedby={insightId}
          className="aspect-auto h-full w-full"
        >
          <BarChart data={chartData} margin={{ bottom: 10, left: 0, right: 0, top: 10 }}>
            <ChartPatternDefs chartId={chartId} categoryCount={data.length} />
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 5]} tickCount={6} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(_value, _name, item) => {
                const original = (item?.payload as MeanDatum | undefined)?.value;
                return [original == null ? "N/A" : original.toFixed(2), "Mean"];
              }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                fontSize: "13px",
              }}
            />
            <Bar dataKey="chartValue" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`${entry.label}-${index}`}
                  fill={entry.value === null ? "var(--muted)" : chartFill(chartId, index)}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Chart legend">
        {data.map((entry, index) => (
          <span key={entry.label} className="flex items-center gap-1.5">
            <ChartSwatch fill={entry.value === null ? "var(--muted)" : chartFill(chartId, index)} />
            <span className="text-muted-foreground text-xs">{entry.label}</span>
          </span>
        ))}
      </div>
      <p id={insightId} className="text-body-sm text-text-secondary">
        {ranked.length === 1
          ? `${ranked[0].label}: ${ranked[0].value!.toFixed(2)}.`
          : `Highest mean: ${ranked[0].label} (${ranked[0].value!.toFixed(2)}). Lowest mean: ${ranked[ranked.length - 1].label} (${ranked[ranked.length - 1].value!.toFixed(2)}).`}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry) => (
                <TableRow key={entry.label}>
                  <TableCell className="font-medium">{entry.label}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entry.value === null ? "N/A" : entry.value.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </div>
  );
}
