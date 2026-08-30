"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
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
import type {
  ProgramHeadInstrumentBreakdownRowDTO,
  ProgramHeadStakeholderSourceKey,
} from "@/features/analytics/program-head-analytics-types";

type ProgramHeadInstrumentBreakdownChartProps = {
  rows: ProgramHeadInstrumentBreakdownRowDTO[];
};

/** Exact per-source values shared by the chart and its unrated empty state. */
function InstrumentExactValuesTable({ rows }: { rows: ProgramHeadInstrumentBreakdownRowDTO[] }) {
  return (
    <details>
      <summary className="text-label-sm text-text-secondary cursor-pointer pointer-coarse:min-h-11">
        View exact values
      </summary>
      <div className="border-border mt-3 overflow-x-auto rounded-lg border">
        <Table aria-label="Exact values by instrument and evidence source">
          <TableHeader>
            <TableRow>
              <TableHead>Instrument</TableHead>
              <TableHead>Evidence Source</TableHead>
              <TableHead className="text-right">Mean Rating</TableHead>
              <TableHead className="text-right">Rating Count</TableHead>
              <TableHead className="text-right">Submitted Responses</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.flatMap((row) =>
              row.sources.map((source) => (
                <TableRow key={`${row.instrumentVersionId}-${source.sourceKey}`}>
                  <TableCell className="font-medium">{row.instrumentLabel}</TableCell>
                  <TableCell>{source.sourceLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {source.meanRating === null ? "—" : source.meanRating.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{source.ratingCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {source.submittedResponseCount}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}

/**
 * Instrument breakdown as grouped bars: one group per instrument version, one
 * bar per evidence source. Means are never pooled across sources, so each bar
 * stays within one disclosed source bucket.
 */
export function ProgramHeadInstrumentBreakdownChart({
  rows,
}: ProgramHeadInstrumentBreakdownChartProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `instrument-breakdown-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;

  const sourceKeys: ProgramHeadStakeholderSourceKey[] = [];
  for (const row of rows) {
    for (const source of row.sources) {
      if (!sourceKeys.includes(source.sourceKey)) {
        sourceKeys.push(source.sourceKey);
      }
    }
  }

  if (rows.length === 0) {
    return null;
  }

  const chartData = rows.map((row) => {
    const entry: Record<string, string | number | null> = { label: row.instrumentLabel };
    for (const source of row.sources) {
      entry[source.sourceKey] = source.meanRating;
    }
    return entry;
  });

  const rated = rows.flatMap((row) =>
    row.sources.map((source) => ({
      label: `${row.instrumentLabel} — ${source.sourceLabel}`,
      meanRating: source.meanRating,
    }))
  );
  const ranked = rated
    .filter((entry): entry is { label: string; meanRating: number } => entry.meanRating !== null)
    .sort((left, right) => right.meanRating - left.meanRating);
  const ratedValues = ranked.map((entry) => entry.meanRating);
  const domain: [number, number] =
    ratedValues.length === 1
      ? [ratedValues[0] - 0.5, ratedValues[0] + 0.5]
      : [Math.min(0, Math.min(...ratedValues) - 0.5), Math.max(...ratedValues) + 0.5];

  const insight =
    ranked.length === 1
      ? `Mean Rating for ${ranked[0].label}: ${ranked[0].meanRating.toFixed(2)}.`
      : ranked.length > 1
        ? `Highest Mean Rating: ${ranked[0].label} (${ranked[0].meanRating.toFixed(2)}). Lowest Mean Rating: ${ranked[ranked.length - 1].label} (${ranked[ranked.length - 1].meanRating.toFixed(2)}).`
        : "No rated instrument evidence in this scope.";

  const sourceLabelByKey = new Map<string, string>(
    rows.flatMap((row) =>
      row.sources.map((source) => [source.sourceKey, source.sourceLabel] as const)
    )
  );

  if (ranked.length === 0) {
    return (
      <div className="space-y-3">
        <h3 id={titleId} className="text-title-sm text-foreground">
          Mean Rating by Instrument and Evidence Source
        </h3>
        <p className="text-body-sm text-text-secondary">
          One group per instrument version, one bar per evidence source. Sources are never pooled;
          missing bars mean that source has no ratings for the instrument in this scope.
        </p>
        <Empty className="h-64">
          <EmptyTitle>No rated instrument evidence yet</EmptyTitle>
          <EmptyDescription>
            No rated instrument evidence is available for this comparison.
          </EmptyDescription>
        </Empty>
        <InstrumentExactValuesTable rows={rows} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 id={titleId} className="text-title-sm text-foreground">
        Mean Rating by Instrument and Evidence Source
      </h3>
      <p className="text-body-sm text-text-secondary">
        One group per instrument version, one bar per evidence source. Sources are never pooled;
        missing bars mean that source has no ratings for the instrument in this scope.
      </p>
      <div className="border-border h-72 w-full rounded-xl border p-3">
        <ChartContainer
          id={chartId}
          role="region"
          aria-labelledby={titleId}
          aria-describedby={insightId}
          className="aspect-auto h-full w-full"
        >
          <BarChart data={chartData} margin={{ bottom: 10, left: 0, right: 0, top: 10 }}>
            <ChartPatternDefs chartId={chartId} categoryCount={sourceKeys.length} />
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              // Recharts thins overlapping category ticks at narrow widths;
              // the exact table and tooltip keep every instrument label.
            />
            <YAxis
              domain={domain}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => value.toFixed(1)}
            />
            <ChartTooltip
              formatter={(value, name) => {
                // `value` is the hovered datum for this Bar's dataKey; `name`
                // is the Bar's display label (the evidence source).
                const label = sourceLabelByKey.get(String(name)) ?? String(name);
                return [value == null ? "No ratings" : Number(value).toFixed(2), label];
              }}
            />
            {sourceKeys.map((sourceKey, sourceIndex) => (
              <Bar
                key={sourceKey}
                dataKey={sourceKey}
                name={sourceLabelByKey.get(sourceKey) ?? sourceKey}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              >
                {rows.map((row) => (
                  <Cell
                    key={`${row.instrumentVersionId}-${sourceKey}`}
                    fill={chartFill(chartId, sourceIndex)}
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ChartContainer>
      </div>
      <div
        role="list"
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
        aria-label="Chart legend"
      >
        {sourceKeys.map((sourceKey, sourceIndex) => (
          <span role="listitem" key={sourceKey} className="flex items-center gap-1.5">
            <ChartSwatch fill={chartFill(chartId, sourceIndex)} />
            <span className="text-muted-foreground text-xs">
              {sourceLabelByKey.get(sourceKey) ?? sourceKey}
            </span>
          </span>
        ))}
      </div>
      <p id={insightId} className="text-body-sm text-text-secondary">
        {insight}
      </p>
      <InstrumentExactValuesTable rows={rows} />
    </div>
  );
}
