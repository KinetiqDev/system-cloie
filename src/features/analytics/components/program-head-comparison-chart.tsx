"use client";

import { useId } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
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

/**
 * One comparable row in a semantic comparison. Independent means are always
 * presented as ranked bars — never pie slices, which would imply the means
 * are parts of one whole.
 */
export type ProgramHeadComparisonDatum = {
  key: string;
  label: string;
  /** Full-precision mean; null when the row has evidence but no ratings. */
  meanRating: number | null;
  ratingCount: number;
  submittedResponseCount: number;
  /** Optional context disclosure (e.g. instruments) shown in the exact table. */
  context?: string | null;
  /** Optional authorized drill-through links shown in the exact table. */
  links?: Array<{ href: string; label: string }>;
};

type ProgramHeadComparisonChartProps = {
  title: string;
  description?: string;
  rows: ProgramHeadComparisonDatum[];
  /**
   * Rows shown in the exact-value table only (e.g. the Unspecified aggregate),
   * never drawn as ranked bars because they do not compare on the same basis.
   */
  tableOnlyRows?: ProgramHeadComparisonDatum[];
};

/** Exact-value disclosure shared by the chart and its unrated empty state. */
function ComparisonExactValuesTable({
  rows,
}: {
  rows: ProgramHeadComparisonDatum[];
}) {
  const showsContext = rows.some((row) => row.context != null);
  const showsLinks = rows.some((row) => (row.links?.length ?? 0) > 0);

  return (
    <details>
      <summary className="text-label-sm text-text-secondary cursor-pointer pointer-coarse:min-h-11">
        View exact values
      </summary>
      <div className="border-border mt-3 overflow-x-auto rounded-lg border">
        <Table aria-label="Exact values by comparison group">
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead className="text-right">Mean Rating</TableHead>
              <TableHead className="text-right">Rating Count</TableHead>
              <TableHead className="text-right">Submitted Responses</TableHead>
              {showsContext ? <TableHead>Instruments</TableHead> : null}
              {showsLinks ? <TableHead>Review Evidence</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.meanRating === null ? "—" : row.meanRating.toFixed(2)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.ratingCount}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.submittedResponseCount}
                </TableCell>
                {showsContext ? <TableCell>{row.context ?? "—"}</TableCell> : null}
                {showsLinks ? (
                  <TableCell>
                    {row.links && row.links.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {row.links.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              className="text-link underline underline-offset-3 hover:text-foreground pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}

export function ProgramHeadComparisonChart({
  title,
  description,
  rows,
  tableOnlyRows = [],
}: ProgramHeadComparisonChartProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `comparison-${instanceId}`;
  const titleId = `${chartId}-title`;
  const insightId = `${chartId}-insight`;

  const ranked = rows
    .filter((row): row is ProgramHeadComparisonDatum & { meanRating: number } =>
      row.meanRating !== null
    )
    .sort((left, right) => right.meanRating - left.meanRating);

  const allTableRows = [...rows, ...tableOnlyRows];

  if (ranked.length === 0) {
    return (
      <div className="space-y-3">
        <h3 id={titleId} className="text-title-sm text-foreground">
          {title}
        </h3>
        {description ? <p className="text-body-sm text-text-secondary">{description}</p> : null}
        <Empty className="h-64">
          <EmptyTitle>No comparable means yet</EmptyTitle>
          <EmptyDescription>No rated evidence is available for this comparison.</EmptyDescription>
        </Empty>
        {allTableRows.length > 0 ? <ComparisonExactValuesTable rows={allTableRows} /> : null}
      </div>
    );
  }

  const values = ranked.map((row) => row.meanRating);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Data-derived domain: frozen snapshot scales are not guaranteed to start
  // at 1 (or to be positive), so a fixed [0, max] axis could clip or mislead.
  const domain: [number, number] =
    values.length === 1 ? [min - 0.5, max + 0.5] : [Math.min(0, min - 0.5), max + 0.5];
  const insight =
    ranked.length === 1
      ? `Mean Rating for ${ranked[0].label}: ${ranked[0].meanRating.toFixed(2)} (${ranked[0].submittedResponseCount} ${ranked[0].submittedResponseCount === 1 ? "response" : "responses"}).`
      : `Highest Mean Rating: ${ranked[0].label} (${ranked[0].meanRating.toFixed(2)}). Lowest Mean Rating: ${ranked[ranked.length - 1].label} (${ranked[ranked.length - 1].meanRating.toFixed(2)}).`;

  return (
    <div className="space-y-3">
      <h3 id={titleId} className="text-title-sm text-foreground">
        {title}
      </h3>
      {description ? <p className="text-body-sm text-text-secondary">{description}</p> : null}
      <div className="border-border h-72 w-full rounded-xl border p-3">
        <ChartContainer
          id={chartId}
          role="region"
          aria-labelledby={titleId}
          aria-describedby={insightId}
          className="aspect-auto h-full w-full"
        >
          <BarChart
            data={ranked}
            layout="vertical"
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <ChartPatternDefs chartId={chartId} categoryCount={ranked.length} />
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={domain}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => value.toFixed(1)}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={152}
              tickLine={false}
              axisLine={false}
              // Long source/course labels are truncated on the axis at narrow
              // viewports; the legend and exact-value table keep full labels.
              tickFormatter={(label: string) =>
                label.length > 18 ? `${label.slice(0, 17)}…` : label
              }
            />
            <Tooltip
              formatter={(_value, _name, item) => {
                const original = (item?.payload as ProgramHeadComparisonDatum | undefined)?.meanRating;
                const responses = (item?.payload as ProgramHeadComparisonDatum | undefined)?.submittedResponseCount;
                return [
                  `${original == null ? "N/A" : original.toFixed(2)} · ${responses ?? 0} ${responses === 1 ? "response" : "responses"}`,
                  "Mean Rating",
                ];
              }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                fontSize: "13px",
              }}
            />
            <Bar dataKey="meanRating" radius={[0, 6, 6, 0]} isAnimationActive={false}>
              {ranked.map((row, index) => (
                <Cell key={row.key} fill={chartFill(chartId, index)} />
              ))}
              <LabelList
                dataKey="meanRating"
                position="right"
                formatter={(value) => Number(value).toFixed(2)}
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
              {row.label} ({row.submittedResponseCount}{" "}
              {row.submittedResponseCount === 1 ? "response" : "responses"})
            </span>
          </span>
        ))}
      </div>
      <p id={insightId} className="text-body-sm text-text-secondary">
        {insight}
      </p>
      <ComparisonExactValuesTable rows={allTableRows} />
    </div>
  );
}
