"use client";

import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartPatternDefs,
  ChartTooltip,
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
import { splitComparableRuns } from "@/features/analytics/services/program-head-analytics-aggregators";
import type {
  GeneralEducationOutcomesDTO,
  GeneralEducationTrendsDTO,
} from "@/features/analytics/general-education-analytics-types";
import { MissingValue } from "./general-education-evidence-marks";

type GeTrendPeriod = GeneralEducationTrendsDTO["periods"][number];
type GeTrendBreak = GeneralEducationTrendsDTO["breaks"][number];

/** Deterministic dash alternation so runs beyond the palette stay distinct. */
function runDash(index: number): string | undefined {
  if (index < 5) return undefined;
  const cycle = Math.floor(index / 5) % 4;
  return ["6 3", "2 2", "8 4 2 4", "1 3"][cycle];
}

function rateLabel(rate: number | null): string {
  return rate === null ? "—" : `${(rate * 100).toFixed(1)}%`;
}

const ALIGNMENT_SERIES = [
  { key: "Learning", label: "Learning" },
  { key: "Practice", label: "Practice" },
  { key: "Opportunity", label: "Opportunity" },
] as const;

/**
 * Mean rating across comparable runs. A run is a maximal sequence of periods
 * whose instrument version, scale identities, mapped ILOs, and source
 * composition match; lines never bridge a break or an unrated period, and a
 * single-point run renders as a standalone marker rather than a fake slope.
 */
export function GeneralEducationTrendChart({
  title,
  periods,
  breaks,
}: {
  title: string;
  periods: GeTrendPeriod[];
  breaks: GeTrendBreak[];
}) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `ge-trend-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;

  const runs = splitComparableRuns(periods);
  const runIndexByLabel = new Map<string, number>();
  const scaleContextByLabel = new Map(
    periods.map((period) => [period.periodLabel, period.scaleContext])
  );
  runs.forEach((run, runIndex) => {
    for (const point of run) runIndexByLabel.set(point.periodLabel, runIndex);
  });

  const chartable = periods.filter(
    (period): period is GeTrendPeriod & { meanRating: number } => period.meanRating !== null
  );
  const hasDrawableRun = runs.some((run) => run.length >= 2);

  if (chartable.length === 0 || !hasDrawableRun) {
    return (
      <div className="flex flex-col gap-3">
        <h2 id={titleId} className="text-heading-lg text-foreground">
          {title}
        </h2>
        <Empty className="h-48">
          <EmptyTitle>No comparable series to draw</EmptyTitle>
          <EmptyDescription>
            A trend needs at least two periods sharing instrument version, scale identities, and
            mapped ILOs.{" "}
            {chartable.length === 0
              ? "No period carries a valid mean yet."
              : "Every rated period stands alone."}{" "}
            The exact values below still report each period.
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  const data = chartable.map((period) => {
    const runIndex = runIndexByLabel.get(period.periodLabel) ?? 0;
    const row: Record<string, string | number | null> = { periodLabel: period.periodLabel };
    for (let index = 0; index < runs.length; index += 1) {
      row[`run${index}`] = index === runIndex ? period.meanRating : null;
    }
    return row;
  });

  // Only genuine instrument/scale/ILO breaks draw a marker; a gap from an
  // unrated period reads as a missing point, never an invented break.
  const breakLabelSet = new Set(breaks.map((breakInfo) => breakInfo.toPeriodLabel));
  const breakLabels = chartable
    .filter((period) => breakLabelSet.has(period.periodLabel))
    .map((period) => period.periodLabel);

  const domains = chartable.flatMap((period) => (period.scaleDomain ? [period.scaleDomain] : []));
  const scaleDomain: [number, number] = [
    Math.min(...domains.map(([min]) => min)),
    Math.max(...domains.map(([, max]) => max)),
  ];
  const insight = `${chartable.length} rated periods are shown in their original scale units, not normalized scores. Each run names its frozen scale; values join only within comparable periods. Different scales are not directly comparable.${breaks.length > 0 ? ` ${breaks.length} comparability breaks separate this series.` : ""}`;

  return (
    <Card>
      <CardHeader className="border-border/60 border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id={titleId} className="text-heading-lg">
            {title}
          </CardTitle>
          <span className="text-label-sm text-muted-foreground">Comparable runs</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="bg-background/50 h-72 w-full rounded-xl p-3">
          <ChartContainer
            id={chartId}
            role="region"
            aria-labelledby={titleId}
            aria-describedby={insightId}
            className="aspect-auto h-full w-full"
          >
            <LineChart data={data} margin={{ bottom: 10, left: 0, right: 12, top: 10 }}>
              <ChartPatternDefs chartId={chartId} categoryCount={runs.length} />
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
              <YAxis
                domain={scaleDomain}
                allowDataOverflow
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                width={28}
              />
              <ChartTooltip
                formatter={(value) => [
                  typeof value === "number" ? value.toFixed(2) : value,
                  "Mean",
                ]}
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
                <span className="text-caption text-muted-foreground">
                  {label} · {scaleContextByLabel.get(run[0].periodLabel)}
                </span>
              </span>
            );
          })}
        </div>

        <p id={insightId} className="text-body-sm text-text-secondary">
          {insight}
        </p>

        {breaks.length > 0 ? (
          <div className="rounded-lg border border-dashed p-3">
            <h3 className="text-label-md text-foreground">Comparability breaks</h3>
            <ul className="text-body-sm text-text-secondary mt-1.5 list-disc space-y-1 pl-5">
              {breaks.map((breakInfo, index) => (
                <li key={index}>
                  {breakInfo.fromPeriodLabel} → {breakInfo.toPeriodLabel}: {breakInfo.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Response rate chronology: submitted responses against opportunities for every
 * in-scope period, with the exact pair printed beside each bar so the length is
 * never the only record of its denominator.
 */
export function GeneralEducationResponseRateTrendChart({
  title,
  periods,
}: {
  title: string;
  periods: GeTrendPeriod[];
}) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `ge-rate-trend-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;

  const rows = periods.filter((period) => period.evaluationOpportunityCount > 0);
  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h2 id={titleId} className="text-heading-lg text-foreground">
          {title}
        </h2>
        <Empty className="h-48">
          <EmptyTitle>No response-rate history</EmptyTitle>
          <EmptyDescription>
            No in-scope period has an evaluation opportunity, so no response rate exists. A period
            without opportunities is unavailable, never zero percent.
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  // Recharts label formatters receive the value alone, so the exact
  // submitted/opportunity pair is precomputed into the chart row.
  const data = rows.map((period) => ({
    periodLabel: period.periodLabel,
    rate: period.responseRate === null ? 0 : period.responseRate * 100,
    submittedResponseCount: period.submittedResponseCount,
    evaluationOpportunityCount: period.evaluationOpportunityCount,
    directLabel: `${period.submittedResponseCount}/${period.evaluationOpportunityCount}`,
  }));
  const withSubmissions = data.filter((row) => row.submittedResponseCount > 0);
  const highest = [...withSubmissions].sort((left, right) => right.rate - left.rate)[0];

  const insight = highest
    ? `Response rate is highest in ${highest.periodLabel} at ${highest.rate.toFixed(1)}% (${highest.submittedResponseCount} of ${highest.evaluationOpportunityCount} opportunities), across ${withSubmissions.length} period${withSubmissions.length === 1 ? "" : "s"} with submitted responses.`
    : "No period in this scope has a submitted response, so every rate is zero percent.";

  return (
    <Card>
      <CardHeader className="border-border/60 border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id={titleId} className="text-heading-lg">
            {title}
          </CardTitle>
          <span className="text-label-sm text-muted-foreground">
            Submitted ÷ opportunities
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="bg-background/50 h-72 w-full rounded-xl p-3">
          <ChartContainer
            id={chartId}
            role="region"
            aria-labelledby={titleId}
            aria-describedby={insightId}
            className="aspect-auto h-full w-full"
          >
            <BarChart data={data} margin={{ top: 18, right: 16, bottom: 10, left: 8 }}>
              <ChartPatternDefs chartId={chartId} categoryCount={data.length} />
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
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                unit="%"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                width={40}
              />
              <ChartTooltip
                formatter={(_value, _name, item) => {
                  const payload = item?.payload as
                    | { submittedResponseCount: number; evaluationOpportunityCount: number }
                    | undefined;
                  if (!payload || payload.evaluationOpportunityCount === 0) {
                    return ["—", "Response Rate"];
                  }
                  return [
                    `${rateLabel(payload.submittedResponseCount / payload.evaluationOpportunityCount)} · ${payload.submittedResponseCount} of ${payload.evaluationOpportunityCount}`,
                    "Response Rate",
                  ];
                }}
              />
              <Bar dataKey="rate" maxBarSize={44} radius={[6, 6, 0, 0]} isAnimationActive={false}>
                {data.map((row, index) => (
                  <Cell key={row.periodLabel} fill={chartFill(chartId, index)} />
                ))}
                <LabelList
                  dataKey="directLabel"
                  position="top"
                  offset={6}
                  fill="var(--foreground)"
                  fontSize={12}
                  fontVariant="tabular-nums"
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
          {data.map((row, index) => (
            <span role="listitem" key={row.periodLabel} className="flex items-center gap-1.5">
              <ChartSwatch fill={chartFill(chartId, index)} />
              <span className="text-caption text-muted-foreground tabular-nums">
                {row.periodLabel} · {row.submittedResponseCount}/{row.evaluationOpportunityCount} (
                {row.rate.toFixed(1)}%)
              </span>
            </span>
          ))}
        </div>

        <p id={insightId} className="text-body-sm text-text-secondary">
          {insight}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Learning / Practice / Opportunity alignment counts per ILO. Counts, never
 * percentages: a rating can carry more than one manifestation label, so shares
 * would not sum to the row and a stacked count stays honest.
 */
export function GeneralEducationAlignmentChart({
  title,
  rows,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  rows: GeneralEducationOutcomesDTO["alignmentCoverage"];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `ge-alignment-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;

  // Coverage rows can exist for every catalogued ILO while every count is zero.
  // Stacking zeros draws a tall blank frame that says nothing, so an all-zero
  // scope reports the compact empty state instead of a chart.
  const hasAnyRating = rows.some(
    (row) => row.learning + row.practice + row.opportunity + row.unclassified > 0
  );

  if (rows.length === 0 || !hasAnyRating) {
    return (
      <div className="flex flex-col gap-3">
        <h2 id={titleId} className="text-heading-lg text-foreground">
          {title}
        </h2>
        <Empty className="h-48">
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </Empty>
      </div>
    );
  }

  const data = rows.map((row) => ({
    outcomeId: row.outcomeId,
    code: row.code,
    Learning: row.learning,
    Practice: row.practice,
    Opportunity: row.opportunity,
  }));
  const totals = rows.map((row) => ({
    outcomeId: row.outcomeId,
    code: row.code,
    total: row.learning + row.practice + row.opportunity + row.unclassified,
  }));
  const classified = totals.reduce((sum, row) => sum + row.total, 0);
  const highest = [...totals].sort((left, right) => right.total - left.total)[0];
  const unclassifiedTotal = rows.reduce((sum, row) => sum + row.unclassified, 0);

  const insight = `${highest.code} has the most aligned CILOs in this scope (${highest.total}). The ${classified} CILO-to-ILO alignments across ${rows.length} ILOs are not additive counts of distinct CILOs. Manifestation is descriptive and never weights a rating; ${unclassifiedTotal} alignments have no classification.`;

  return (
    <Card>
      <CardHeader className="border-border/60 border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id={titleId} className="text-heading-lg">
            {title}
          </CardTitle>
          <span className="text-label-sm text-muted-foreground font-medium">
            Aligned CILO counts
          </span>
        </div>
        <p className="text-body-sm text-text-secondary text-pretty">
          One stacked bar per ILO counts its aligned CILOs by Learning, Practice, and Opportunity. A
          CILO aligned to several ILOs appears once under each ILO. These are mapping counts, not
          ratings.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="bg-background/50 w-full rounded-xl p-3">
          <ChartContainer
            id={chartId}
            role="region"
            aria-labelledby={titleId}
            aria-describedby={insightId}
            className="aspect-auto w-full"
            style={{ height: Math.max(220, data.length * 56 + 96) }}
          >
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 40, bottom: 8, left: 8 }}
            >
              <ChartPatternDefs chartId={chartId} categoryCount={ALIGNMENT_SERIES.length} />
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
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
                formatter={(value) => [`${value} ${Number(value) === 1 ? "CILO" : "CILOs"}`, ""]}
              />
              {ALIGNMENT_SERIES.map((entry, index) => (
                <Bar
                  key={entry.key}
                  dataKey={entry.key}
                  stackId="alignment"
                  maxBarSize={32}
                  isAnimationActive={false}
                >
                  {data.map((row) => (
                    <Cell key={row.outcomeId} fill={chartFill(chartId, index)} />
                  ))}
                  <LabelList
                    dataKey={entry.key}
                    position="center"
                    fontSize={11}
                    fontVariant="tabular-nums"
                    fill="var(--card-foreground)"
                    formatter={(value: React.ReactNode) =>
                      Number(value) === 0 ? "" : String(value)
                    }
                  />
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
          {ALIGNMENT_SERIES.map((entry, index) => (
            <span role="listitem" key={entry.key} className="flex items-center gap-1.5">
              <ChartSwatch fill={chartFill(chartId, index)} />
              <span className="text-caption text-muted-foreground">{entry.label}</span>
            </span>
          ))}
        </div>

        <p id={insightId} className="text-body-sm text-text-secondary">
          {insight}
        </p>

        <div className="border-border/80 overflow-x-auto rounded-lg border">
          <Table aria-label="Exact values: alignment counts per institutional learning outcome">
            <TableHeader>
              <TableRow>
                <TableHead>ILO</TableHead>
                <TableHead className="text-right">Learning</TableHead>
                <TableHead className="text-right">Practice</TableHead>
                <TableHead className="text-right">Opportunity</TableHead>
                <TableHead className="text-right">Unclassified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.outcomeId}>
                  <TableCell className="font-medium whitespace-nowrap">{row.code}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.learning}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.practice}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.opportunity}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.unclassified === 0 ? <MissingValue /> : row.unclassified}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
