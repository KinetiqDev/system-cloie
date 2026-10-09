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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartPatternDefs,
  ChartSwatch,
  ChartTooltip,
  chartFill,
} from "@/components/ui/chart";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { splitComparableRuns } from "../services/program-head-analytics-aggregators";

const PART_FILL = "var(--chart-1)";
const REST_FILL = "var(--border-default)";

function truncate(label: string, max: number) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function ExactTable({
  label,
  headers,
  rows,
}: {
  label: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <Disclosure>
      <DisclosureTrigger variant="chip">Show numbers</DisclosureTrigger>
      <DisclosureContent>
        <div className="border-border/80 overflow-x-auto rounded-lg border">
          <Table aria-label={label}>
            <TableHeader>
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead key={header} className={index === 0 ? undefined : "text-right"}>
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row[0]}>
                  {row.map((cell, index) => (
                    <TableCell
                      key={`${row[0]}-${headers[index]}`}
                      className={index === 0 ? "font-medium" : "text-right tabular-nums"}
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DisclosureContent>
    </Disclosure>
  );
}

function ChartFrame({
  chartId,
  title,
  description,
  children,
}: {
  chartId: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-col gap-1">
        <h2 id={`${chartId}-title`} className="text-heading-lg text-foreground">
          {title}
        </h2>
        {description ? <p className="text-body-sm text-text-secondary">{description}</p> : null}
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function EmptyFrame({
  chartId,
  title,
  description,
  emptyText,
}: {
  chartId: string;
  title: string;
  description?: string;
  emptyText: string;
}) {
  return (
    <ChartFrame chartId={chartId} title={title} description={description}>
      <Empty className="h-40">
        <EmptyTitle>Nothing to show yet</EmptyTitle>
        <EmptyDescription>{emptyText}</EmptyDescription>
      </Empty>
    </ChartFrame>
  );
}

type DeanShareRow = {
  key: string;
  label: string;
  fullLabel?: string;
  part: number;
  total: number;
};

/**
 * Part of a whole per row as a 100% bar (answered vs not answered, covered vs
 * not covered). Rows without a total are left out: no denominator means no
 * share, never 0%. Exact counts stay on the bar label.
 */
export function DeanShareChart({
  title,
  description,
  partLabel,
  restLabel,
  rows,
  emptyText,
}: {
  title: string;
  description?: string;
  partLabel: string;
  restLabel: string;
  rows: DeanShareRow[];
  emptyText: string;
}) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `dean-share-${instanceId}`;
  const wide = useMediaQuery("(min-width: 640px)");
  const data = rows
    .filter((row) => row.total > 0)
    .map((row) => {
      const pct = (row.part / row.total) * 100;
      return {
        ...row,
        pct,
        partPct: pct,
        restPct: 100 - pct,
        direct: wide ? `${pct.toFixed(0)}% · ${row.part}/${row.total}` : `${pct.toFixed(0)}%`,
      };
    })
    .sort((left, right) => right.pct - left.pct || right.total - left.total);

  if (data.length === 0)
    return (
      <EmptyFrame chartId={chartId} title={title} description={description} emptyText={emptyText} />
    );

  const insightId = `${chartId}-insight`;
  const first = data[0];
  const last = data[data.length - 1];
  const insight =
    data.length === 1
      ? `${first.label}: ${first.pct.toFixed(1)}% (${first.part} of ${first.total}).`
      : first.pct === last.pct
        ? `All groups: ${first.pct.toFixed(1)}%.`
        : `Highest: ${first.label} ${first.pct.toFixed(1)}%. Lowest: ${last.label} ${last.pct.toFixed(1)}%.`;

  return (
    <ChartFrame chartId={chartId} title={title} description={description}>
      <ChartContainer
        id={chartId}
        role="region"
        aria-labelledby={`${chartId}-title`}
        aria-describedby={insightId}
        className="aspect-auto w-full"
        style={{ height: data.length * 40 + 48 }}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
          barCategoryGap={8}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickFormatter={(value: number) => `${value}%`}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={wide ? 88 : 80}
            tickLine={false}
            axisLine={false}
            tickFormatter={(label: string) => truncate(label, wide ? 14 : 12)}
          />
          <ChartTooltip
            formatter={(_value, name, item) => {
              const row = item?.payload as (typeof data)[number] | undefined;
              if (!row) return ["", String(name)];
              const isPart = name === partLabel;
              const count = isPart ? row.part : row.total - row.part;
              return [`${count} of ${row.total}`, String(name)];
            }}
          />
          <YAxis
            yAxisId="values"
            orientation="right"
            type="category"
            dataKey="direct"
            width={wide ? 104 : 44}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <Bar
            dataKey="partPct"
            name={partLabel}
            stackId="share"
            fill={PART_FILL}
            isAnimationActive={false}
          />
          <Bar
            dataKey="restPct"
            name={restLabel}
            stackId="share"
            fill={REST_FILL}
            radius={[0, 6, 6, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
      <div role="list" aria-label="Chart legend" className="flex flex-wrap gap-x-4 gap-y-1.5">
        {[
          [partLabel, PART_FILL],
          [restLabel, REST_FILL],
        ].map(([label, fill]) => (
          <span role="listitem" key={label} className="flex items-center gap-1.5">
            <ChartSwatch fill={fill} />
            <span className="text-label-sm text-muted-foreground">{label}</span>
          </span>
        ))}
      </div>
      <p id={insightId} className="text-body-sm text-text-secondary">
        {insight}
      </p>
      <ExactTable
        label={title}
        headers={["Group", partLabel, "Total", "Share"]}
        rows={data.map((row) => [
          row.fullLabel ?? row.label,
          String(row.part),
          String(row.total),
          `${row.pct.toFixed(1)}%`,
        ])}
      />
    </ChartFrame>
  );
}

type DeanValueRow = {
  key: string;
  label: string;
  fullLabel?: string;
  value: number;
  /** Extra text for the bar label, tooltip and numbers table. */
  detail?: string;
  /** Row fill; defaults to the first chart color. */
  color?: string;
  /** Plain-word status shown in the numbers table for colored rows. */
  status?: string;
};

function PeriodTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string | number };
}) {
  const lines = String(payload?.value ?? "").split(" · ");
  return (
    <g transform={`translate(${Number(x)},${Number(y)})`}>
      <text textAnchor="middle" fontSize={11} className="fill-muted-foreground">
        {lines.map((line, index) => (
          <tspan key={line} x={0} dy={index === 0 ? 14 : 13}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/**
 * One value per row: horizontal bars for groups, vertical columns for
 * periods (kept in the order given, oldest first). Means and counts share a
 * zero baseline so bar length stays proportional.
 */
function DeanValueExactTable({
  title,
  valueLabel,
  rows,
  format,
}: {
  title: string;
  valueLabel: string;
  rows: DeanValueRow[];
  format: (value: number) => string;
}) {
  const showStatus = rows.some((row) => row.status);
  return (
    <ExactTable
      label={title}
      headers={["Group", valueLabel, ...(showStatus ? ["Reading"] : []), "Detail"]}
      rows={rows.map((row) => [
        row.fullLabel ?? row.label,
        format(row.value),
        ...(showStatus ? [row.status ?? "—"] : []),
        row.detail ?? "—",
      ])}
    />
  );
}

function valueFormatter(format: "count" | "percent" | "mean") {
  if (format === "percent") return (value: number) => `${value.toFixed(1)}%`;
  if (format === "mean") return (value: number) => value.toFixed(2);
  return (value: number) => value.toLocaleString();
}

function valueInsight(rows: DeanValueRow[], format: (value: number) => string) {
  const ranked = [...rows].sort((left, right) => right.value - left.value);
  const highest = ranked[0];
  const lowest = ranked[ranked.length - 1];
  if (ranked.length === 1) return `${highest.label}: ${format(highest.value)}.`;
  if (highest.value === lowest.value) return `All groups: ${format(highest.value)}.`;
  return `Highest: ${highest.label} ${format(highest.value)}. Lowest: ${lowest.label} ${format(lowest.value)}.`;
}

function valueTooltip(
  row: DeanValueRow | undefined,
  format: (value: number) => string,
  label: string
) {
  if (!row) return ["", label];
  return [`${format(row.value)}${row.detail ? ` · ${row.detail}` : ""}`, label];
}

function directValue(row: DeanValueRow, format: (value: number) => string, showDetail: boolean) {
  return showDetail && row.detail ? `${format(row.value)} · ${row.detail}` : format(row.value);
}

function benchmarkLine(benchmark?: number) {
  if (!benchmark) return null;
  return (
    <ReferenceLine
      x={benchmark}
      stroke="var(--text-muted)"
      strokeDasharray="6 4"
      strokeWidth={2}
      label={{
        value: `Target ${benchmark.toFixed(2)}`,
        position: "top",
        fill: "var(--foreground)",
        fontSize: 12,
      }}
    />
  );
}

function deanValuePlot({
  data,
  vertical,
  wide,
  axisMax,
  benchmark,
  format,
  fmt,
  valueLabel,
}: {
  data: Array<DeanValueRow & { direct: string }>;
  vertical: boolean;
  wide: boolean;
  axisMax?: number;
  benchmark?: number;
  format: "count" | "percent" | "mean";
  fmt: (value: number) => string;
  valueLabel: string;
}) {
  const cells = data.map((row) => <Cell key={row.key} fill={row.color ?? PART_FILL} />);
  const domain: [number, number | "auto"] = [0, axisMax ?? "auto"];
  const percentTick = format === "percent" ? (value: number) => `${value}%` : undefined;
  const labelWidth = wide ? 150 : 112;
  const labelLength = wide ? 24 : 17;
  const marginRight = wide ? 160 : 48;
  const label = (
    <LabelList
      dataKey="direct"
      position={vertical ? "top" : "right"}
      offset={8}
      fill="var(--foreground)"
      fontSize={12}
      fontVariant="tabular-nums"
    />
  );
  const numberAxis = (
    <XAxis
      type="number"
      domain={domain}
      allowDecimals={format === "mean"}
      tickFormatter={percentTick}
      tickLine={false}
      axisLine={false}
    />
  );

  return vertical ? (
    <BarChart data={data} margin={{ top: 24, right: 8, bottom: 8, left: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="label"
        interval={0}
        height={52}
        tickLine={false}
        axisLine={false}
        tick={(props) => <PeriodTick {...props} />}
      />
      <YAxis
        domain={domain}
        allowDecimals={false}
        width={40}
        tickLine={false}
        axisLine={false}
        tickFormatter={percentTick}
      />
      <ChartTooltip
        formatter={(_value, _name, item) =>
          valueTooltip(item?.payload as DeanValueRow | undefined, fmt, valueLabel)
        }
      />
      <Bar
        dataKey="value"
        name={valueLabel}
        maxBarSize={56}
        radius={[6, 6, 0, 0]}
        isAnimationActive={false}
      >
        {cells}
        {label}
      </Bar>
    </BarChart>
  ) : (
    <BarChart
      data={data}
      layout="vertical"
      margin={{ top: benchmark ? 24 : 4, right: marginRight, bottom: 4, left: 4 }}
      barCategoryGap={8}
    >
      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
      {numberAxis}
      <YAxis
        type="category"
        dataKey="label"
        width={labelWidth}
        tickLine={false}
        axisLine={false}
        tickFormatter={(text: string) => truncate(text, labelLength)}
      />
      <ChartTooltip
        formatter={(_value, _name, item) =>
          valueTooltip(item?.payload as DeanValueRow | undefined, fmt, valueLabel)
        }
      />
      {benchmarkLine(benchmark)}
      <Bar
        dataKey="value"
        name={valueLabel}
        maxBarSize={32}
        radius={[0, 6, 6, 0]}
        isAnimationActive={false}
      >
        {cells}
        {label}
      </Bar>
    </BarChart>
  );
}

export function DeanValueChart({
  title,
  description,
  valueLabel,
  format,
  orientation = "horizontal",
  rows,
  emptyText,
  max,
  benchmark,
  keepOrder = false,
}: {
  title: string;
  description?: string;
  valueLabel: string;
  format: "count" | "percent" | "mean";
  orientation?: "horizontal" | "vertical";
  rows: DeanValueRow[];
  emptyText: string;
  max?: number;
  benchmark?: number;
  keepOrder?: boolean;
}) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `dean-value-${instanceId}`;
  const wide = useMediaQuery("(min-width: 640px)");
  const fmt = valueFormatter(format);
  const data = rows.map((row) => ({
    ...row,
    direct: directValue(row, fmt, wide && orientation === "horizontal"),
  }));
  if (orientation === "horizontal" && !keepOrder)
    data.sort((left, right) => right.value - left.value);

  if (data.length === 0)
    return (
      <EmptyFrame chartId={chartId} title={title} description={description} emptyText={emptyText} />
    );

  const insightId = `${chartId}-insight`;
  const insight = valueInsight(data, fmt);
  const axisMax = format === "percent" ? 100 : (max ?? undefined);
  const vertical = orientation === "vertical";

  return (
    <ChartFrame chartId={chartId} title={title} description={description}>
      <ChartContainer
        id={chartId}
        role="region"
        aria-labelledby={`${chartId}-title`}
        aria-describedby={insightId}
        className="aspect-auto w-full"
        style={{ height: vertical ? 280 : data.length * 44 + 48 }}
      >
        {deanValuePlot({ data, vertical, wide, axisMax, benchmark, format, fmt, valueLabel })}
      </ChartContainer>
      <p id={insightId} className="text-body-sm text-text-secondary">
        {insight}
      </p>
      <DeanValueExactTable title={title} valueLabel={valueLabel} rows={data} format={fmt} />
    </ChartFrame>
  );
}

type DeanTrendPeriod = {
  label: string;
  meanRating: number | null;
  comparableWithPrevious: boolean;
};

/**
 * Average rating over periods. Lines join only comparable periods (same
 * instrument, scale and outcomes); a lone period is a dot, never a slope.
 * Values stay in original scale units, so the axis follows the scale.
 */
export function DeanTrendChart({
  title,
  description,
  periods,
  breakBefore,
  domain,
}: {
  title: string;
  description?: string;
  periods: DeanTrendPeriod[];
  /** Labels of periods that start a new comparable run. */
  breakBefore: string[];
  domain: [number, number];
}) {
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `dean-trend-${instanceId}`;
  const runs = splitComparableRuns(
    periods.map((period) => ({ periodLabel: period.label, ...period }))
  );
  const rated = periods.filter(
    (period): period is DeanTrendPeriod & { meanRating: number } => period.meanRating !== null
  );
  if (rated.length === 0 || !runs.some((run) => run.length >= 2))
    return (
      <EmptyFrame
        chartId={chartId}
        title={title}
        description={description}
        emptyText="A line needs at least two periods that used the same instrument, scale and outcomes."
      />
    );

  const runIndexByLabel = new Map<string, number>();
  runs.forEach((run, index) =>
    run.forEach((point) => runIndexByLabel.set(point.periodLabel, index))
  );
  const data = periods.map((period) => ({
    label: period.label,
    ...Object.fromEntries(
      runs.map((_run, index) => [
        `run${index}`,
        runIndexByLabel.get(period.label) === index ? period.meanRating : null,
      ])
    ),
  }));
  const insightId = `${chartId}-insight`;
  const insight = `${rated.length} rated periods. Lines join only comparable periods; separate runs are not a single trend.`;

  return (
    <ChartFrame chartId={chartId} title={title} description={description}>
      <ChartContainer
        id={chartId}
        role="region"
        aria-labelledby={`${chartId}-title`}
        aria-describedby={insightId}
        className="aspect-auto w-full"
        style={{ height: 280 }}
      >
        <LineChart data={data} margin={{ top: 16, right: 44, bottom: 8, left: 0 }}>
          <ChartPatternDefs chartId={chartId} categoryCount={runs.length} />
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            interval={0}
            height={52}
            tickLine={false}
            axisLine={false}
            tick={(props) => <PeriodTick {...props} />}
          />
          <YAxis
            domain={domain}
            ticks={Array.from(
              { length: Math.floor(domain[1]) - Math.ceil(domain[0]) + 1 },
              (_, index) => Math.ceil(domain[0]) + index
            )}
            width={32}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            formatter={(value) => [typeof value === "number" ? value.toFixed(2) : value, "Average"]}
          />
          {breakBefore.map((label) => (
            <ReferenceLine
              key={label}
              x={label}
              stroke="var(--border-default)"
              strokeDasharray="4 4"
            />
          ))}
          {runs.map((run, index) => {
            const fill = chartFill(chartId, index);
            return (
              <Line
                key={run[0].periodLabel}
                type="linear"
                dataKey={`run${index}`}
                stroke={fill}
                strokeWidth={2}
                dot={{ r: 4, fill, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
                connectNulls={false}
              >
                <LabelList
                  dataKey={`run${index}`}
                  position="top"
                  offset={8}
                  fill="var(--foreground)"
                  fontSize={12}
                  formatter={(value) => (typeof value === "number" ? value.toFixed(2) : "")}
                />
              </Line>
            );
          })}
        </LineChart>
      </ChartContainer>
      {runs.length > 1 && (
        <div role="list" aria-label="Chart legend" className="flex flex-wrap gap-x-4 gap-y-1.5">
          {runs.map((run, index) => (
            <span role="listitem" key={run[0].periodLabel} className="flex items-center gap-1.5">
              <ChartSwatch fill={chartFill(chartId, index)} />
              <span className="text-label-sm text-muted-foreground">
                {run.length > 1
                  ? `${run[0].periodLabel} → ${run[run.length - 1].periodLabel}`
                  : `${run[0].periodLabel} (alone)`}
              </span>
            </span>
          ))}
        </div>
      )}
      <p id={insightId} className="text-body-sm text-text-secondary">
        {insight}
      </p>
      <ExactTable
        label={title}
        headers={["Period", "Average rating"]}
        rows={rated.map((period) => [period.label, period.meanRating.toFixed(2)])}
      />
    </ChartFrame>
  );
}
