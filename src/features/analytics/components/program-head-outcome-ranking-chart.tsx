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
import type { ProgramHeadOutcomeDTO } from "@/features/analytics/program-head-analytics-types";

type RankedOutcomeDatum = {
  label: string;
  code: string;
  value: number;
};

type ProgramHeadOutcomeRankingChartProps = {
  title: string;
  outcomes: ProgramHeadOutcomeDTO[];
};

/**
 * Ranked Program Graduate Outcome means. The axis domain is derived from the
 * data rather than a universal 1–5 scale, because contributing instruments
 * may legitimately use different frozen scales. Rows without a mean are never
 * drawn (they carry no defensible central tendency).
 */
export function ProgramHeadOutcomeRankingChart({
  title,
  outcomes,
}: ProgramHeadOutcomeRankingChartProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `outcome-ranking-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;

  const ranked = outcomes
    .filter((outcome): outcome is ProgramHeadOutcomeDTO & { meanRating: number } =>
      outcome.meanRating !== null
    )
    .map((outcome): RankedOutcomeDatum => ({
      label: `${outcome.code} — ${outcome.name}`,
      code: outcome.code,
      value: outcome.meanRating,
    }))
    .sort((left, right) => right.value - left.value);

  if (ranked.length === 0) {
    return (
      <div className="space-y-3">
        <h3 id={titleId} className="text-title-sm text-foreground">
          {title}
        </h3>
        <p className="text-body-sm text-text-secondary">
          Only Graduate Outcomes with at least one valid rating can be ranked; rows without a
          mean carry no defensible central tendency.
        </p>
        <Empty className="h-64">
          <EmptyTitle>No rated outcome evidence yet</EmptyTitle>
          <EmptyDescription>
            No rated Graduate Outcome evidence is available for this ranking.
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  const values = ranked.map((entry) => entry.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const domain: [number, number] =
    values.length === 1 ? [min - 0.5, max + 0.5] : [Math.min(0, min - 0.5), max + 0.5];

  const insight =
    ranked.length === 1
      ? `${ranked[0].code}: ${ranked[0].value.toFixed(2)}.`
      : `Highest mean: ${ranked[0].code} (${ranked[0].value.toFixed(2)}). Lowest mean: ${ranked[ranked.length - 1].code} (${ranked[ranked.length - 1].value.toFixed(2)}).`;

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
          <BarChart data={ranked} margin={{ bottom: 10, left: 0, right: 0, top: 10 }}>
            <ChartPatternDefs chartId={chartId} categoryCount={ranked.length} />
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="code" tickLine={false} axisLine={false} />
            <YAxis domain={domain} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(_value, _name, item) => {
                const original = (item?.payload as RankedOutcomeDatum | undefined)?.value;
                return [original == null ? "N/A" : original.toFixed(2), "Mean Rating"];
              }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                fontSize: "13px",
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {ranked.map((entry, index) => (
                <Cell key={entry.code} fill={chartFill(chartId, index)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      <div
        role="list"
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
        aria-label="Chart legend"
      >
        {ranked.map((entry, index) => (
          <span role="listitem" key={entry.code} className="flex items-center gap-1.5">
            <ChartSwatch fill={chartFill(chartId, index)} />
            <span className="text-muted-foreground text-xs">{entry.label}</span>
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
          <Table aria-label="Ranked mean ratings by graduate outcome">
            <TableHeader>
              <TableRow>
                <TableHead>Graduate Outcome</TableHead>
                <TableHead className="text-right">Mean Rating</TableHead>
                <TableHead className="text-right">Rating Count</TableHead>
                <TableHead className="text-right">Submitted Responses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((entry) => {
                const outcome = outcomes.find((candidate) => candidate.code === entry.code)!;
                return (
                  <TableRow key={entry.code}>
                    <TableCell className="font-medium">{entry.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.value.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {outcome.ratingCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {outcome.submittedResponseCount}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </details>
    </div>
  );
}
