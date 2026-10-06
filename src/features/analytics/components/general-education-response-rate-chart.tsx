"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartPatternDefs,
  ChartSwatch,
  chartFill,
} from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * One group in a response-rate comparison. `responseRate` is null when the
 * group has no in-scope evaluation opportunities: that is an unavailable rate,
 * never a zero-percent rate.
 */
export type GeneralEducationResponseRateDatum = {
  key: string;
  label: string;
  responseRate: number | null;
  submittedResponseCount: number;
  evaluationOpportunityCount: number;
};

type ResponseRateChartProps = {
  title: string;
  description?: string;
  rows: GeneralEducationResponseRateDatum[];
  emptyTitle: string;
  emptyDescription: string;
};

function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${(rate * 100).toFixed(1)}%`;
}

function ResponseRateExactValuesTable({ rows }: { rows: GeneralEducationResponseRateDatum[] }) {
  return (
    <div className="border-border/80 overflow-x-auto rounded-lg border">
      <Table aria-label="Exact values: response rate by group">
        <TableHeader>
          <TableRow>
            <TableHead>Group</TableHead>
            <TableHead className="text-right">Response Rate</TableHead>
            <TableHead className="text-right">Submitted / Opportunities</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="align-top font-medium">{row.label}</TableCell>
              <TableCell className="text-right align-top tabular-nums">
                {formatRate(row.responseRate)}
              </TableCell>
              <TableCell className="text-right align-top whitespace-nowrap tabular-nums">
                {row.submittedResponseCount} / {row.evaluationOpportunityCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Response rate as ranked horizontal bars with the exact submitted/opportunity
 * pair carried as a direct label, so the percentage is never the only evidence
 * of what it was computed from.
 */
export function GeneralEducationResponseRateChart({
  title,
  description,
  rows,
  emptyTitle,
  emptyDescription,
}: ResponseRateChartProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `ge-response-rate-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;

  const rated = rows.filter(
    (row): row is GeneralEducationResponseRateDatum & { responseRate: number } =>
      row.responseRate !== null
  );
  const ranked = [...rated].sort((left, right) => right.responseRate - left.responseRate);
  const unavailable = rows.length - ranked.length;

  if (ranked.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h3 id={titleId} className="text-heading-lg text-foreground">
          {title}
        </h3>
        {description ? <p className="text-body-sm text-text-secondary">{description}</p> : null}
        <Empty className="h-48">
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </Empty>
      </div>
    );
  }

  const insight = [
    `Response rate ranges from ${(ranked[ranked.length - 1].responseRate * 100).toFixed(1)}% (${
      ranked[ranked.length - 1].label
    }) to ${(ranked[0].responseRate * 100).toFixed(1)}% (${ranked[0].label}).`,
    unavailable > 0
      ? `${unavailable} ${unavailable === 1 ? "group has" : "groups have"} no in-scope evaluation opportunities, so no rate exists rather than 0%.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  // Recharts label formatters receive the value alone, so the exact
  // submitted/opportunity pair is precomputed into the chart row.
  const chartRows = ranked.map((row) => ({
    ...row,
    directLabel: `${(row.responseRate * 100).toFixed(1)}% · ${row.submittedResponseCount}/${row.evaluationOpportunityCount}`,
  }));

  return (
    <Card>
      <CardHeader className="border-border/60 border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id={titleId} className="text-heading-lg">
            {title}
          </CardTitle>
          <span className="text-muted-foreground text-xs font-medium">
            Submitted ÷ evaluation opportunities
          </span>
        </div>
        {description ? (
          <p className="text-body-sm text-text-secondary text-pretty">{description}</p>
        ) : null}
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
            <BarChart
              data={chartRows}
              layout="vertical"
              margin={{ top: 8, right: 96, bottom: 8, left: 8 }}
            >
              <ChartPatternDefs chartId={chartId} categoryCount={chartRows.length} />
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                unit="%"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={152}
                tickLine={false}
                axisLine={false}
                tickFormatter={(label: string) =>
                  label.length > 20 ? `${label.slice(0, 19)}…` : label
                }
              />
              <ChartTooltip
                formatter={(_value, _name, item) => {
                  const payload = item?.payload as GeneralEducationResponseRateDatum | undefined;
                  if (!payload || payload.responseRate === null) return ["—", "Response Rate"];
                  return [
                    `${(payload.responseRate * 100).toFixed(1)}% · ${payload.submittedResponseCount} of ${
                      payload.evaluationOpportunityCount
                    } opportunities`,
                    "Response Rate",
                  ];
                }}
              />
              <Bar
                dataKey="responseRate"
                maxBarSize={32}
                radius={[0, 6, 6, 0]}
                isAnimationActive={false}
              >
                {ranked.map((row, index) => (
                  <Cell key={row.key} fill={chartFill(chartId, index)} />
                ))}
                {/* Direct label carries the exact submitted/opportunity pair, so the
                  percentage never stands alone as its own evidence. */}
                <LabelList
                  dataKey="directLabel"
                  position="right"
                  offset={8}
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
          {ranked.map((row, index) => (
            <span role="listitem" key={row.key} className="flex items-center gap-1.5">
              <ChartSwatch fill={chartFill(chartId, index)} />
              <span className="text-muted-foreground text-xs">
                {row.label} · {row.submittedResponseCount}/{row.evaluationOpportunityCount}
              </span>
            </span>
          ))}
        </div>

        {unavailable > 0 ? (
          <p className="text-body-sm text-text-secondary">
            {rows
              .filter((row) => row.responseRate === null)
              .map((row) => row.label)
              .join(", ")}{" "}
            {unavailable === 1 ? "has" : "have"} no in-scope evaluation opportunities, so{" "}
            {unavailable === 1 ? "its rate is" : "their rates are"} unavailable rather than zero.
          </p>
        ) : null}

        <p id={insightId} className="text-body-sm text-text-secondary">
          {insight}
        </p>
        <ResponseRateExactValuesTable rows={rows} />
      </CardContent>
    </Card>
  );
}
