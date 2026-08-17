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
      </div>
    );
  }

  const maxMean = ranked[0].meanRating;
  const insight =
    ranked.length === 1
      ? `Mean Rating for ${ranked[0].label}: ${ranked[0].meanRating.toFixed(2)} (${ranked[0].submittedResponseCount} ${ranked[0].submittedResponseCount === 1 ? "response" : "responses"}).`
      : `Highest Mean Rating: ${ranked[0].label} (${ranked[0].meanRating.toFixed(2)}). Lowest Mean Rating: ${ranked[ranked.length - 1].label} (${ranked[ranked.length - 1].meanRating.toFixed(2)}).`;

  const allTableRows = [...rows, ...tableOnlyRows];
  const showsContext = allTableRows.some((row) => row.context != null);
  const showsLinks = allTableRows.some((row) => (row.links?.length ?? 0) > 0);

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
              domain={[0, maxMean * 1.15]}
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
      <details>
        <summary className="text-label-sm text-text-secondary cursor-pointer">
          View exact values
        </summary>
        <div className="border-border mt-3 overflow-x-auto rounded-lg border">
          <Table>
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
              {allTableRows.map((row) => (
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
                                className="text-link underline underline-offset-3 hover:text-foreground"
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
    </div>
  );
}
