"use client";

import { useId } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ChartContainer, ChartPatternDefs, ChartSwatch, chartFill } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProgramHeadResponseCompositionDatum = {
  key: string;
  label: string;
  /** Distinct submitted responses in this source bucket. */
  count: number;
};

type ProgramHeadResponseCompositionDonutProps = {
  data: ProgramHeadResponseCompositionDatum[];
};

/**
 * Genuine response composition: the share of submitted responses per evidence
 * source. A donut is reserved for part-to-whole composition and is never used
 * for independent means.
 */
export function ProgramHeadResponseCompositionDonut({
  data,
}: ProgramHeadResponseCompositionDonutProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `composition-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;

  const total = data.reduce((sum, entry) => sum + entry.count, 0);
  const largest = [...data].sort((left, right) => right.count - left.count)[0];

  if (data.length === 0 || total === 0) {
    return null;
  }

  const insight =
    data.length === 1
      ? `All ${total} submitted ${total === 1 ? "response is" : "responses are"} from ${largest.label}.`
      : `${total} submitted responses in total. Largest source: ${largest.label} (${((largest.count / total) * 100).toFixed(1)}%).`;

  return (
    <div className="space-y-3">
      <h3 id={titleId} className="text-title-sm text-foreground">
        Submitted Responses by Evidence Source
      </h3>
      <p className="text-body-sm text-text-secondary">
        Share of submitted responses per evidence source. This is response composition, not a
        comparison of means.
      </p>
      <div className="border-border h-72 w-full rounded-xl border p-3">
        <ChartContainer
          id={chartId}
          role="region"
          aria-labelledby={titleId}
          aria-describedby={insightId}
          className="aspect-auto h-full w-full"
        >
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <ChartPatternDefs chartId={chartId} categoryCount={data.length} />
            <Tooltip
              formatter={(value, _name, item) => {
                const payload = item?.payload as ProgramHeadResponseCompositionDatum | undefined;
                const share =
                  payload && total > 0 ? ` · ${((payload.count / total) * 100).toFixed(1)}%` : "";
                return [`${value}${share}`, "Submitted responses"];
              }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                fontSize: "13px",
              }}
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={entry.key} fill={chartFill(chartId, index)} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>
      <div
        role="list"
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
        aria-label="Chart legend"
      >
        {data.map((entry, index) => (
          <span role="listitem" key={entry.key} className="flex items-center gap-1.5">
            <ChartSwatch fill={chartFill(chartId, index)} />
            <span className="text-muted-foreground text-xs">
              {entry.label} ({entry.count} {entry.count === 1 ? "response" : "responses"})
            </span>
          </span>
        ))}
      </div>
      <p id={insightId} className="text-body-sm text-text-secondary">
        {insight}
      </p>
      <details>
        <summary className="text-label-sm text-text-secondary cursor-pointer">
          View exact values
        </summary>
        <div className="border-border mt-3 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evidence Source</TableHead>
                <TableHead className="text-right">Submitted Responses</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry) => (
                <TableRow key={entry.key}>
                  <TableCell className="font-medium">{entry.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.count}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {total === 0 ? "—" : `${((entry.count / total) * 100).toFixed(1)}%`}
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
