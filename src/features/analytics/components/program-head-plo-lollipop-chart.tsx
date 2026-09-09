"use client";

import { useId } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Scatter, XAxis, YAxis, ZAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartPatternDefs,
  ChartSwatch,
  chartFill,
} from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/ui/disclosure";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProgramHeadOutcomeDTO } from "@/features/analytics/program-head-analytics-types";

type LollipopDatum = {
  code: string;
  label: string;
  value: number;
};

type ProgramHeadPloLollipopChartProps = {
  title: string;
  outcomes: ProgramHeadOutcomeDTO[];
};

/**
 * PLO means as a lollipop/dot plot on the fixed 1–5 rating scale. Stems mark
 * the distance from the scale floor and dots mark the exact mean, so
 * outcomes stay comparable at a glance. Rows without a mean carry no
 * defensible position and are never drawn (they remain in the exact table).
 */
export function ProgramHeadPloLollipopChart({
  title,
  outcomes,
}: ProgramHeadPloLollipopChartProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `plo-lollipop-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;

  const ranked = outcomes
    .filter(
      (outcome): outcome is ProgramHeadOutcomeDTO & { meanRating: number } =>
        outcome.meanRating !== null
    )
    .map(
      (outcome): LollipopDatum => ({
        code: outcome.code,
        label: `${outcome.code} — ${outcome.name}`,
        value: outcome.meanRating,
      })
    )
    .sort((left, right) => right.value - left.value);

  if (ranked.length === 0) {
    return (
      <div className="space-y-3">
        <h3 id={titleId} className="text-title-sm text-foreground">
          {title}
        </h3>
        <Empty className="h-64">
          <EmptyTitle>No rated outcome evidence yet</EmptyTitle>
          <EmptyDescription>No valid ratings are available for these outcomes.</EmptyDescription>
        </Empty>
      </div>
    );
  }

  const insight =
    ranked.length === 1
      ? `${ranked[0].code}: ${ranked[0].value.toFixed(2)}.`
      : `Highest mean: ${ranked[0].code} (${ranked[0].value.toFixed(2)}). Lowest mean: ${ranked[ranked.length - 1].code} (${ranked[ranked.length - 1].value.toFixed(2)}).`;

  return (
    <div className="border-border/80 bg-card space-y-4 rounded-xl border p-4 shadow-xs sm:p-5">
      <div className="border-border/60 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <h3 id={titleId} className="text-title-md text-foreground font-semibold tracking-tight">
          {title}
        </h3>
        <span className="text-muted-foreground text-xs font-medium">Fixed 1–5 scale</span>
      </div>
      <div className="border-border/60 bg-background/50 w-full rounded-xl border p-3">
        <ChartContainer
          id={chartId}
          role="region"
          aria-labelledby={titleId}
          aria-describedby={insightId}
          className="aspect-auto w-full"
          style={{ height: Math.max(240, ranked.length * 56 + 96) }}
        >
          <ComposedChart data={ranked} layout="vertical" margin={{ bottom: 8, left: 8, right: 24, top: 8 }}>
            <ChartPatternDefs chartId={chartId} categoryCount={ranked.length} />
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="code"
              width={88}
              tickLine={false}
              axisLine={false}
              tickFormatter={(code: string) => (code.length > 12 ? `${code.slice(0, 11)}…` : code)}
            />
            <ZAxis type="number" range={[140, 140]} />
            <ChartTooltip
              formatter={(_value, _name, item) => {
                const original = (item?.payload as LollipopDatum | undefined)?.value;
                return [original == null ? "N/A" : original.toFixed(2), "Mean Rating"];
              }}
            />
            <Bar dataKey="value" barSize={4} radius={[2, 2, 2, 2]} isAnimationActive={false} tooltipType="none">
              {ranked.map((entry, index) => (
                <Cell key={entry.code} fill={chartFill(chartId, index)} fillOpacity={0.45} />
              ))}
            </Bar>
            <Scatter dataKey="value" name="Mean Rating" isAnimationActive={false}>
              {ranked.map((entry, index) => (
                <Cell key={entry.code} fill={chartFill(chartId, index)} />
              ))}
            </Scatter>
          </ComposedChart>
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
      <Disclosure>
        <DisclosureTrigger variant="chip">View exact values</DisclosureTrigger>
        <DisclosureContent>
          <div className="border-border/80 overflow-x-auto rounded-lg border">
            <Table aria-label="Mean ratings by graduate outcome on the fixed 1–5 scale">
            <TableHeader>
              <TableRow>
                <TableHead>Program Learning Outcome</TableHead>
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
                    <TableCell className="text-right tabular-nums">{outcome.ratingCount}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {outcome.submittedResponseCount}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            </Table>
          </div>
        </DisclosureContent>
      </Disclosure>
    </div>
  );
}
