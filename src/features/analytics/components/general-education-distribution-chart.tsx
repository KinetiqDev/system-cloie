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
import type { OutcomeCategoryDTO } from "@/features/analytics/outcome-evidence-types";
import { FewRatingsMarker, MissingValue } from "./general-education-evidence-marks";
import { countedNoun } from "./general-education-evidence-primitives";

/** One 100% Likert row: a single instrument-version scale identity. */
export type GeneralEducationDistributionGroup = {
  key: string;
  label: string;
  /** Frozen scale identity, e.g. "1–5 (5-point)"; null when no ratings resolved. */
  scaleLabel: string | null;
  categories: OutcomeCategoryDTO[];
};

type DistributionChartProps = {
  title: string;
  description?: string;
  groups: GeneralEducationDistributionGroup[];
  emptyTitle: string;
  emptyDescription: string;
};

/** Union of every category value across groups, ascending. */
function unionCategoryValues(groups: GeneralEducationDistributionGroup[]): number[] {
  const values = new Set<number>();
  for (const group of groups) {
    for (const category of group.categories) values.add(category.value);
  }
  return [...values].sort((left, right) => left - right);
}

function seriesKey(value: number): string {
  return `v${String(value).replace(".", "-")}`;
}

function totalOf(categories: OutcomeCategoryDTO[]): number {
  return categories.reduce((sum, category) => sum + category.count, 0);
}

/**
 * Legend and direct-label text for one category: value, descriptor, exact
 * count, and exact share of the group's own total.
 */
function categoryLegendLabel(category: OutcomeCategoryDTO, total: number): string {
  const share = total === 0 ? "—" : `${(category.percentage * 100).toFixed(1)}%`;
  return `${category.value}${
    category.label ? ` · ${category.label}` : ""
  } — ${category.count} ${category.count === 1 ? "rating" : "ratings"} (${share})`;
}

function ExactDistributionTable({ groups }: { groups: GeneralEducationDistributionGroup[] }) {
  const showsGroup = groups.length > 1;

  return (
    <div className="border-border/80 overflow-x-auto rounded-lg border">
      <Table aria-label="Exact values: Likert distribution by scale">
        <TableHeader>
          <TableRow>
            {showsGroup ? <TableHead>Group</TableHead> : null}
            <TableHead>Category</TableHead>
            <TableHead>Scale</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">Ratings</TableHead>
            <TableHead className="text-right">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.flatMap((group) => {
            const total = totalOf(group.categories);
            return group.categories.map((category) => (
              <TableRow key={`${group.key}-${category.value}`}>
                {showsGroup ? (
                  <TableCell className="align-top font-medium whitespace-nowrap">
                    {group.label}
                  </TableCell>
                ) : null}
                <TableCell className="align-top">
                  {category.label ?? <span className="text-text-secondary">No descriptor</span>}
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  {group.scaleLabel ?? <MissingValue />}
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {category.value}
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {category.count}
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {total === 0 ? <MissingValue /> : `${(category.percentage * 100).toFixed(1)}%`}
                </TableCell>
              </TableRow>
            ));
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * 100% Likert distribution per scale identity.
 *
 * Percentages are computed here rather than through `stackOffset="expand"`:
 * expand rescales each stack to 0–1 while the axis is declared 0–100, which
 * renders every bar at 1% width. Values therefore carry their own share in
 * percent points, and the raw count stays available in the tooltip, the direct
 * labels, and the exact table — so no share depends on hover.
 */
export function GeneralEducationDistributionChart({
  title,
  description,
  groups,
  emptyTitle,
  emptyDescription,
}: DistributionChartProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `ge-distribution-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;

  const rows = groups.filter((group) => totalOf(group.categories) > 0);
  const values = unionCategoryValues(rows);

  if (rows.length === 0 || values.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h3 id={titleId} className="text-heading-lg text-foreground">
          {title}
        </h3>
        {description ? <p className="text-body-sm text-text-secondary">{description}</p> : null}
        <Empty className="h-56">
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </Empty>
      </div>
    );
  }

  // Each bar sums to 100 because every share is expressed in percent points of
  // its own group's total.
  const data = rows.map((group) => {
    const row: Record<string, string | number> = {
      key: group.key,
      label: group.label,
      total: totalOf(group.categories),
    };
    for (const category of group.categories) {
      row[seriesKey(category.value)] = category.percentage * 100;
    }
    return row;
  });

  const dominant = rows
    .map((group) => {
      const total = totalOf(group.categories);
      const top = group.categories.reduce(
        (best, category) => (best === null || category.count > best.count ? category : best),
        null as OutcomeCategoryDTO | null
      );
      return { group, total, top };
    })
    .filter((entry) => entry.top !== null && entry.top.count > 0)
    .sort(
      (left, right) => (right.top?.count ?? 0) / right.total - (left.top?.count ?? 0) / left.total
    );

  const insight =
    dominant.length === 0
      ? "No category reached a majority on any scale in this scope."
      : `Most-selected category: ${dominant[0].group.label} at value ${
          dominant[0].top?.value
        } (${dominant[0].top?.count} of ${dominant[0].total} valid ratings, ${(
          (dominant[0].top?.percentage ?? 0) * 100
        ).toFixed(
          1
        )}%). Each bar is normalized to its own scale, so bar lengths are shares within a scale rather than a shared range.`;

  return (
    <Card>
      <CardHeader className="border-border/60 border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id={titleId} className="text-heading-lg">
            {title}
          </CardTitle>
          <span className="text-muted-foreground text-xs font-medium">
            100% of each scale&apos;s valid ratings
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
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
            >
              <ChartPatternDefs chartId={chartId} categoryCount={values.length} />
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
                width={168}
                tickLine={false}
                axisLine={false}
                tickFormatter={(label: string) =>
                  label.length > 24 ? `${label.slice(0, 23)}…` : label
                }
              />
              <ChartTooltip
                payloadUniqBy={(entry) => entry.dataKey}
                formatter={(_value, name, item) => {
                  const payload = item?.payload as Record<string, string | number> | undefined;
                  const group = rows.find((entry) => entry.key === payload?.key);
                  const total = typeof payload?.total === "number" ? payload.total : 0;
                  const category = group?.categories.find(
                    (entry) => seriesKey(entry.value) === String(name)
                  );
                  const percent = Number(payload?.[String(name)] ?? 0);
                  const count = total === 0 ? 0 : Math.round((percent / 100) * total);
                  return [
                    `${countedNoun(count, "rating")} (${percent.toFixed(1)}%${
                      category?.label ? ` · ${category.label}` : ""
                    })`,
                    `Value ${String(name).replace(/^v/, "").replace("-", ".")}`,
                  ];
                }}
              />
              {values.map((value, index) => (
                <Bar
                  key={value}
                  dataKey={seriesKey(value)}
                  stackId="distribution"
                  maxBarSize={36}
                  isAnimationActive={false}
                >
                  {data.map((row) => (
                    <Cell
                      key={row.key}
                      fill={
                        row[seriesKey(value)] === undefined
                          ? "transparent"
                          : chartFill(chartId, index)
                      }
                    />
                  ))}
                  {/* Direct label: a slice narrower than ~6% would collide, so the
                      share stays in the legend row and the exact table instead. */}
                  <LabelList
                    dataKey={seriesKey(value)}
                    position="center"
                    fontSize={11}
                    fontVariant="tabular-nums"
                    fill="var(--card-foreground)"
                    formatter={(label: React.ReactNode) => {
                      const percent = Number(label);
                      return percent >= 6 ? `${percent.toFixed(0)}%` : "";
                    }}
                  />
                </Bar>
              ))}
            </BarChart>
          </ChartContainer>
        </div>

        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const total = totalOf(row.categories);
            return (
              <div key={row.key} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-label-md text-foreground font-semibold">{row.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {row.scaleLabel ?? "No scale resolved"}
                  </span>
                  {/* A distribution carries no respondent count, so it reports
                      the rating count on its own terms rather than borrowing the
                      respondents' thin-sample language. */}
                  {total > 0 && total < 5 ? <FewRatingsMarker ratingCount={total} /> : null}
                </div>
                <ul
                  className="flex flex-wrap gap-x-4 gap-y-1"
                  aria-label={`Direct values for ${row.label}`}
                >
                  {row.categories.map((category) => (
                    <li
                      key={category.value}
                      className="text-text-secondary flex items-center gap-1.5 text-xs"
                    >
                      <ChartSwatch fill={chartFill(chartId, values.indexOf(category.value))} />
                      <span className="tabular-nums">{categoryLegendLabel(category, total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p id={insightId} className="text-body-sm text-text-secondary">
          {insight}
        </p>
        <ExactDistributionTable groups={rows} />
      </CardContent>
    </Card>
  );
}
