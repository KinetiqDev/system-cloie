"use client";

import { useId } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartSwatch, chartFill } from "@/components/ui/chart";
import { splitComparableRuns } from "@/features/analytics/services/program-head-analytics-aggregators";
import type {
  ProgramHeadTrendBreakDTO,
  ProgramHeadTrendPeriodDTO,
} from "@/features/analytics/program-head-analytics-types";

/** Deterministic dash alternation so runs beyond the palette stay distinct. */
function runDash(index: number): string | undefined {
  if (index < 5) return undefined;
  const cycle = Math.floor(index / 5) % 4;
  return ["6 3", "2 2", "8 4 2 4", "1 3"][cycle];
}

type ProgramHeadTrendChartProps = {
  title: string;
  periods: ProgramHeadTrendPeriodDTO[];
  breaks: ProgramHeadTrendBreakDTO[];
};

export function ProgramHeadTrendChart({ title, periods, breaks }: ProgramHeadTrendChartProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `trend-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;

  const runs = splitComparableRuns(periods);
  const runIndexByLabel = new Map<string, number>();
  runs.forEach((run, runIndex) => {
    for (const point of run) runIndexByLabel.set(point.periodLabel, runIndex);
  });

  const chartable = periods.filter(
    (period): period is ProgramHeadTrendPeriodDTO & { meanRating: number } =>
      period.meanRating !== null
  );

  const data = chartable.map((period) => {
    const runIndex = runIndexByLabel.get(period.periodLabel) ?? 0;
    const row: Record<string, string | number | null> = { periodLabel: period.periodLabel };
    for (let index = 0; index < runs.length; index += 1) {
      row[`run${index}`] = index === runIndex ? period.meanRating : null;
    }
    return row;
  });

  // Only genuine instrument/scale/outcome breaks (server-derived) draw a
  // marker; a gap from an unrated period is visible as a missing point and
  // never gets unexplained dashed markers.
  const breakLabelSet = new Set(breaks.map((breakInfo) => breakInfo.toPeriodLabel));
  const breakLabels = chartable
    .filter((period) => breakLabelSet.has(period.periodLabel))
    .map((period) => period.periodLabel);

  const rated = chartable.map((period) => ({
    periodLabel: period.periodLabel,
    meanRating: period.meanRating,
  }));
  const sortedRated = [...rated].sort((left, right) => left.meanRating - right.meanRating);
  const lowest = sortedRated[0];
  const highest = sortedRated[sortedRated.length - 1];

  const hasDrawableRun = runs.some((run) => run.length >= 2);

  if (chartable.length === 0 || !hasDrawableRun) {
    return null;
  }

  const insight = [
    `Mean ratings range from ${lowest.meanRating.toFixed(2)} (${lowest.periodLabel}) to ${highest.meanRating.toFixed(2)} (${highest.periodLabel}) across ${rated.length} rated period${rated.length === 1 ? "" : "s"}.`,
    breaks.length > 0
      ? `${breaks.length} comparability break${breaks.length === 1 ? "" : "s"} separate this series; values are joined only within comparable periods.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

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
          <LineChart data={data} margin={{ bottom: 10, left: 0, right: 0, top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="periodLabel"
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={70}
              tick={{ fontSize: 12 }}
            />
            <YAxis domain={[0, "auto"]} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <ChartTooltip
              formatter={(value) => [typeof value === "number" ? value.toFixed(2) : value, "Mean"]}
            />
            {breakLabels.map((label) => (
              <ReferenceLine
                key={label}
                x={label}
                stroke="var(--color-border)"
                strokeDasharray="4 4"
              />
            ))}
            {runs.map((run, index) => {
              const standalone = run.length < 2;
              const fill = standalone ? "var(--muted)" : chartFill(chartId, index);
              return (
                <Line
                  key={index}
                  type="linear"
                  dataKey={`run${index}`}
                  stroke={fill}
                  strokeWidth={2}
                  strokeDasharray={standalone ? undefined : runDash(index)}
                  dot={{ r: 3, fill, strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              );
            })}
          </LineChart>
        </ChartContainer>
      </div>
      <div
        role="list"
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
        aria-label="Chart legend"
      >
        {runs.map((run, index) => {
          const standalone = run.length < 2;
          const fill = standalone ? "var(--muted)" : chartFill(chartId, index);
          const label = standalone
            ? `${run[0].periodLabel} (standalone)`
            : `${run[0].periodLabel} → ${run[run.length - 1].periodLabel}`;
          return (
            <span role="listitem" key={index} className="flex items-center gap-1.5">
              <ChartSwatch fill={fill} />
              <span className="text-muted-foreground text-xs">{label}</span>
            </span>
          );
        })}
      </div>
      <p id={insightId} className="text-body-sm text-text-secondary">
        {insight}
      </p>
      {breaks.length > 0 ? (
        <div className="rounded-lg border border-dashed p-3">
          <h4 className="text-label-md text-foreground">Comparability breaks</h4>
          <ul className="text-body-sm text-text-secondary mt-1.5 list-disc space-y-1 pl-5">
            {breaks.map((breakInfo, index) => (
              <li key={index}>
                {breakInfo.fromPeriodLabel} → {breakInfo.toPeriodLabel}: {breakInfo.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
