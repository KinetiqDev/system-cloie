"use client";

import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartSwatch } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  OutcomeEvidenceDTO,
  OutcomeLayerLabels,
} from "@/features/analytics/outcome-evidence-types";
import { OUTCOME_ATTAINMENT_BENCHMARK } from "@/features/analytics/aggregators/outcome-attainment";
import { AttainmentBadge, getAttainmentColor } from "./outcome-attainment-badge";
import { AttainmentLegend } from "./outcome-attainment-legend";

type MeanBarDatum = {
  code: string;
  label: string;
  value: number;
  ratingCount: number;
  submittedResponseCount: number;
  outcomeId: string;
};

type OutcomeMeanBarChartProps = {
  title: string;
  outcomes: OutcomeEvidenceDTO[];
  labels: OutcomeLayerLabels;
  /** Keep catalog order instead of ranking by mean. */
  preserveOrder?: boolean;
};

/**
 * Outcome means as horizontal bars from a true zero baseline, so bar length
 * stays proportional to the mean. The axis spans the widest frozen scale in
 * evidence; rows that pool several scales carry the cross-scale notice in the
 * exact table. Rows without a mean are never drawn (they remain in the table).
 */
export function OutcomeMeanBarChart({
  title,
  outcomes,
  labels,
  preserveOrder = false,
}: OutcomeMeanBarChartProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `outcome-mean-bar-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;

  const rated = outcomes.filter(
    (outcome): outcome is OutcomeEvidenceDTO & { meanRating: number } => outcome.meanRating !== null
  );
  const bars = rated.map(
    (outcome): MeanBarDatum => ({
      code: outcome.code,
      label: `${outcome.code} — ${outcome.name}`,
      value: outcome.meanRating,
      ratingCount: outcome.ratingCount,
      submittedResponseCount: outcome.submittedResponseCount,
      outcomeId: outcome.outcomeId,
    })
  );
  if (!preserveOrder) bars.sort((left, right) => right.value - left.value);
  const ranked = [...bars].sort((left, right) => right.value - left.value);
  const scaleMaxima = rated.flatMap((outcome) =>
    outcome.distributions.map((scale) => scale.maxValue)
  );
  const axisMax = Math.max(1, ...scaleMaxima, ...bars.map((bar) => bar.value));
  const mixedScales = new Set(
    rated.flatMap((outcome) => outcome.distributions.map((scale) => scale.scaleLabel))
  );

  const hasAttainment =
    labels.short === "PO" ||
    labels.short === "CILO" ||
    outcomes.some((outcome) => outcome.attainment !== undefined);

  if (bars.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h2 id={titleId} className="text-heading-lg text-foreground">
          {title}
        </h2>
        <Empty className="h-64">
          <EmptyTitle>No rated outcome evidence yet</EmptyTitle>
          <EmptyDescription>No valid ratings are available for these outcomes.</EmptyDescription>
        </Empty>
        {hasAttainment && <AttainmentLegend />}
      </div>
    );
  }

  const insight =
    ranked.length === 1
      ? `${ranked[0].code}: ${ranked[0].value.toFixed(2)}.`
      : `Highest mean: ${ranked[0].code} (${ranked[0].value.toFixed(2)}). Lowest mean: ${ranked[ranked.length - 1].code} (${ranked[ranked.length - 1].value.toFixed(2)}).`;
  const scaleCaption =
    mixedScales.size === 1 ? `Scale ${[...mixedScales][0]}` : `Axis 0–${axisMax}, scales vary`;
  const byOutcomeId = new Map(rated.map((outcome) => [outcome.outcomeId, outcome]));
  const hasClassified = rated.some((outcome) => outcome.attainment?.status === "classified");
  const showBenchmark = hasClassified && OUTCOME_ATTAINMENT_BENCHMARK <= axisMax;

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-heading-lg text-foreground">
          {title}
        </h2>
        <span className="text-label-sm text-muted-foreground font-medium">{scaleCaption}</span>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <div className="w-full min-w-0">
          <ChartContainer
            id={chartId}
            role="region"
            aria-labelledby={titleId}
            aria-describedby={insightId}
            className="aspect-auto w-full"
            style={{ height: Math.max(240, bars.length * 56 + 96) }}
          >
            <BarChart
              data={bars}
              layout="vertical"
              margin={{ top: 28, right: 48, bottom: 8, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, axisMax]}
                ticks={Array.from({ length: axisMax + 1 }, (_, tick) => tick)}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="code"
                width={88}
                tickLine={false}
                axisLine={false}
                tickFormatter={(code: string) =>
                  code.length > 12 ? `${code.slice(0, 11)}…` : code
                }
              />
              <ChartTooltip
                payloadUniqBy={(entry) => entry.dataKey}
                formatter={(_value, _name, item) => {
                  const original = (item?.payload as MeanBarDatum | undefined)?.value;
                  return [original == null ? "N/A" : original.toFixed(2), "Mean Rating"];
                }}
              />
              {showBenchmark ? (
                <ReferenceLine
                  x={OUTCOME_ATTAINMENT_BENCHMARK}
                  stroke="var(--text-muted)"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  label={{
                    value: `Benchmark ${OUTCOME_ATTAINMENT_BENCHMARK.toFixed(2)}`,
                    position: "top",
                    fill: "var(--foreground)",
                    fontSize: 12,
                  }}
                />
              ) : null}
              <Bar dataKey="value" maxBarSize={32} radius={[0, 6, 6, 0]} isAnimationActive={false}>
                {bars.map((entry) => {
                  const outcome = byOutcomeId.get(entry.outcomeId);
                  const fill = hasAttainment
                    ? getAttainmentColor(outcome?.attainment)
                    : "var(--chart-1)";
                  return <Cell key={entry.code} fill={fill} />;
                })}
                <LabelList
                  dataKey="value"
                  position="right"
                  offset={8}
                  fill="var(--foreground)"
                  fontSize={12}
                  fontVariant="tabular-nums"
                  formatter={(value) => Number(value).toFixed(2)}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
        {hasAttainment ? (
          <AttainmentLegend />
        ) : (
          <div
            role="list"
            className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
            aria-label="Chart legend"
          >
            {bars.map((entry) => (
              <span role="listitem" key={entry.code} className="flex items-center gap-1.5">
                <ChartSwatch fill="var(--chart-1)" />
                <span className="text-label-sm text-muted-foreground">{entry.label}</span>
              </span>
            ))}
          </div>
        )}
        <p id={insightId} className="text-body-sm text-text-secondary">
          {insight}{" "}
          {showBenchmark
            ? `Benchmark ${OUTCOME_ATTAINMENT_BENCHMARK.toFixed(2)} marks the primary attainment threshold; classification uses full-precision means.`
            : null}
        </p>
        <Disclosure>
          <DisclosureTrigger variant="chip">View exact values</DisclosureTrigger>
          <DisclosureContent>
            <div className="border-border/80 overflow-x-auto rounded-lg border">
              <Table aria-label={`Mean ratings by ${labels.singular.toLowerCase()}`}>
                <TableHeader>
                  <TableRow>
                    <TableHead>{labels.singular}</TableHead>
                    <TableHead className="text-right">Mean Rating</TableHead>
                    <TableHead>Attainment</TableHead>
                    <TableHead className="text-right">Rating Count</TableHead>
                    <TableHead className="text-right">Submitted Responses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bars.map((entry) => {
                    const outcome = byOutcomeId.get(entry.outcomeId);
                    return (
                      <TableRow key={entry.code}>
                        <TableCell className="font-medium">{entry.label}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {entry.value.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <AttainmentBadge attainment={outcome?.attainment} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {entry.ratingCount}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {entry.submittedResponseCount}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </DisclosureContent>
        </Disclosure>
      </CardContent>
    </Card>
  );
}
