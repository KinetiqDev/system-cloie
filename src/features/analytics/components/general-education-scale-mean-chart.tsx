"use client";

import { useId } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartPatternDefs,
  ChartSwatch,
  chartFill,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LowSampleMarker,
  LOW_SAMPLE_RESPONSES,
  MissingValue,
} from "./general-education-evidence-marks";

/** One comparable row inside a single instrument-version scale identity. */
export type GeneralEducationScaleMeanDatum = {
  key: string;
  label: string;
  /** Full-precision mean; null when the row has evidence but no valid ratings. */
  meanRating: number | null;
  ratingCount: number;
  submittedResponseCount: number;
  context?: string | null;
  links?: Array<{ href: string; label: string }>;
};

type GeneralEducationScaleMeanSeries = {
  key: string;
  /** Frozen scale identity, e.g. "1–5 (5-point)". */
  scaleLabel: string;
  /** Highest descriptor on this scale, so the axis matches the real range. */
  maxValue: number;
  rows: GeneralEducationScaleMeanDatum[];
};

type ScaleMeanChartProps = {
  title: string;
  description?: string;
  series: GeneralEducationScaleMeanSeries[];
  emptyTitle: string;
  emptyDescription: string;
};

function ScaleExactValuesTable({ series }: { series: GeneralEducationScaleMeanSeries[] }) {
  const showsContext = series.some((entry) => entry.rows.some((row) => row.context != null));
  const showsLinks = series.some((entry) => entry.rows.some((row) => (row.links?.length ?? 0) > 0));

  return (
    <div className="border-border/80 overflow-x-auto rounded-lg border">
      <Table aria-label={`Exact values: ${series[0]?.rows[0]?.label ? "means by group" : "means"}`}>
        <TableHeader>
          <TableRow>
            <TableHead>Group</TableHead>
            <TableHead>Scale</TableHead>
            <TableHead className="text-right">Mean Rating</TableHead>
            <TableHead className="text-right">Rating Count</TableHead>
            <TableHead className="text-right">Submitted Responses</TableHead>
            {showsContext ? <TableHead>Instruments</TableHead> : null}
            {showsLinks ? <TableHead>Review Evidence</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {series.flatMap((entry) =>
            entry.rows.map((row) => (
              <TableRow key={`${entry.key}-${row.key}`}>
                <TableCell className="align-top font-medium">{row.label}</TableCell>
                <TableCell className="align-top whitespace-nowrap">{entry.scaleLabel}</TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {row.meanRating === null ? <MissingValue /> : row.meanRating.toFixed(2)}
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {row.ratingCount}
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {row.submittedResponseCount}
                </TableCell>
                {showsContext ? (
                  <TableCell className="align-top whitespace-normal">
                    {row.context ?? <MissingValue />}
                  </TableCell>
                ) : null}
                {showsLinks ? (
                  <TableCell className="align-top">
                    {row.links && row.links.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {row.links.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              className="text-link hover:text-foreground underline underline-offset-3 pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <MissingValue />
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Ranked means, one chart per instrument-version scale identity. Rows never
 * move between scales, so a 1–4 mean is never ranked against a 1–5 mean and
 * no blended mean can be drawn by accident.
 */
export function GeneralEducationScaleMeanChart({
  title,
  description,
  series,
  emptyTitle,
  emptyDescription,
}: ScaleMeanChartProps) {
  if (series.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-heading-lg text-foreground">{title}</h3>
        {description ? <p className="text-body-sm text-text-secondary">{description}</p> : null}
        <Empty className="h-56">
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {series.map((entry) => (
        <ScaleMeanChartPanel
          key={entry.key}
          headingId={`${title}-${entry.key}`}
          title={`${title} · ${entry.scaleLabel}`}
          series={entry}
        />
      ))}
      {description ? <p className="text-body-sm text-text-secondary">{description}</p> : null}
      <ScaleExactValuesTable series={series} />
    </div>
  );
}

function ScaleMeanChartPanel({
  title,
  headingId,
  series,
}: {
  title: string;
  headingId: string;
  series: GeneralEducationScaleMeanSeries;
}) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `ge-scale-mean-${instanceId}`;
  const insightId = `${chartId}-insight`;

  const ranked = series.rows
    .filter(
      (row): row is GeneralEducationScaleMeanDatum & { meanRating: number } =>
        row.meanRating !== null
    )
    .sort((left, right) => right.meanRating - left.meanRating);

  if (ranked.length === 0) {
    return (
      <section className="flex flex-col gap-3" aria-labelledby={headingId}>
        <h3 id={headingId} className="text-title-md text-foreground font-semibold">
          {title}
        </h3>
        <Empty className="h-48">
          <EmptyTitle>No rated evidence on this scale</EmptyTitle>
          <EmptyDescription>
            Responses exist for these groups, but none carried a valid in-scale rating. The exact
            counts stay in the table below.
          </EmptyDescription>
        </Empty>
      </section>
    );
  }

  const insight =
    ranked.length === 1
      ? `Mean Rating for ${ranked[0].label} on ${series.scaleLabel}: ${ranked[0].meanRating.toFixed(2)} from ${ranked[0].ratingCount} valid ${ranked[0].ratingCount === 1 ? "rating" : "ratings"}.`
      : `Highest on ${series.scaleLabel}: ${ranked[0].label} (${ranked[0].meanRating.toFixed(2)}). Lowest: ${ranked[ranked.length - 1].label} (${ranked[ranked.length - 1].meanRating.toFixed(2)}).`;
  const thinSampleRows = series.rows.filter(
    (row) => row.submittedResponseCount > 0 && row.submittedResponseCount < LOW_SAMPLE_RESPONSES
  );

  return (
    <Card>
      <CardHeader className="border-border/60 border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id={headingId} className="text-title-md font-semibold">
            {title}
          </CardTitle>
          <span className="text-muted-foreground text-xs font-medium">Ranked comparison</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="bg-background/50 h-72 w-full rounded-xl p-3">
          <ChartContainer
            id={chartId}
            role="region"
            aria-labelledby={headingId}
            aria-describedby={insightId}
            className="aspect-auto h-full w-full"
          >
            <BarChart
              data={ranked}
              layout="vertical"
              margin={{ top: 8, right: 52, bottom: 8, left: 8 }}
            >
              <ChartPatternDefs chartId={chartId} categoryCount={ranked.length} />
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, series.maxValue]}
                ticks={Array.from({ length: series.maxValue + 1 }, (_, tick) => tick)}
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
                  const payload = item?.payload as
                    | (GeneralEducationScaleMeanDatum & { lowSample?: boolean })
                    | undefined;
                  const responses = payload?.submittedResponseCount ?? 0;
                  return [
                    `${payload?.meanRating == null ? "N/A" : payload.meanRating.toFixed(2)} · ${
                      payload?.ratingCount ?? 0
                    } ${payload?.ratingCount === 1 ? "rating" : "ratings"} · ${responses} ${
                      responses === 1 ? "response" : "responses"
                    }`,
                    "Mean Rating",
                  ];
                }}
              />
              <Bar
                dataKey="meanRating"
                maxBarSize={32}
                radius={[0, 6, 6, 0]}
                isAnimationActive={false}
              >
                {ranked.map((row, index) => (
                  <Cell key={row.key} fill={chartFill(chartId, index)} />
                ))}
                <LabelList
                  dataKey="meanRating"
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

        <div
          role="list"
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
          aria-label={`Chart legend for ${series.scaleLabel}`}
        >
          {ranked.map((row, index) => (
            <span role="listitem" key={row.key} className="flex items-center gap-1.5">
              <ChartSwatch fill={chartFill(chartId, index)} />
              <span className="text-muted-foreground text-xs">
                {row.label} ({row.submittedResponseCount}{" "}
                {row.submittedResponseCount === 1 ? "response" : "responses"})
              </span>
            </span>
          ))}
        </div>

        {thinSampleRows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {thinSampleRows.map((row) => (
              <LowSampleMarker key={row.key} responseCount={row.submittedResponseCount} />
            ))}
          </div>
        ) : null}

        <p id={insightId} className="text-body-sm text-text-secondary">
          {insight}
        </p>
      </CardContent>
    </Card>
  );
}
