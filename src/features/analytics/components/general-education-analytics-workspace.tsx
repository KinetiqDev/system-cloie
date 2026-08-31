"use client";

import { useId } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { ClipboardList, Inbox, MessageSquareText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartPatternDefs,
  ChartSwatch,
  chartFill,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { GeneralEducationAnalyticsDTO } from "@/features/analytics/general-education-analytics-types";
import { QualitativeWordCloud } from "@/features/analytics/components/qualitative-word-cloud";
import { splitComparableRuns } from "@/features/analytics/services/program-head-analytics-aggregators";

type Props = {
  data: GeneralEducationAnalyticsDTO;
  filters: { schoolYearId?: string; semester?: string; termInstanceId?: string };
};

const BASE_PATH = "/gen-ed-coordinator/analytics";
function resetHref(): string {
  return BASE_PATH;
}

// fallow-ignore-next-line complexity
export function GeneralEducationAnalyticsWorkspace({ data, filters }: Props) {
  const { kpi, emptyReason, scope, periodOptions, courseBreakdowns, trends, feedback } = data;
  const resetClass = cn(buttonVariants({ variant: "outline", size: "sm" }));

  const hasOptions =
    periodOptions.schoolYears.length > 0 ||
    periodOptions.semesters.length > 0 ||
    periodOptions.termInstances.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-lg">Analytics</h1>
        <p className="text-text-secondary text-sm">
          General Education evidence — Course-bound, submitted only, across Programs.
          {scope.periodLabel ? <span> · {scope.periodLabel}</span> : null}
        </p>
      </div>

      {hasOptions ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Scope</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              method="get"
              action={BASE_PATH}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <Select
                label="School Year"
                name="schoolYearId"
                value={filters.schoolYearId ?? ""}
                options={periodOptions.schoolYears.map((o) => ({ value: o.id, label: o.label }))}
                blankLabel="All school years"
              />
              <Select
                label="Semester"
                name="semester"
                value={filters.semester ?? ""}
                options={periodOptions.semesters}
                blankLabel="All semesters"
              />
              <Select
                label="Academic Term"
                name="termInstanceId"
                value={filters.termInstanceId ?? ""}
                options={periodOptions.termInstances.map((o) => ({ value: o.id, label: o.label }))}
                blankLabel="All terms"
              />
              <div className="flex items-end gap-2">
                <button type="submit" className={cn(buttonVariants({ size: "sm" }))}>
                  Apply
                </button>
                <Link
                  href={resetHref()}
                  className="text-link inline-flex min-h-11 items-center px-3 text-sm underline-offset-3 hover:underline"
                >
                  Reset
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Overview KPIs */}
      {emptyReason === "no-assignments" ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No evaluation assignments</EmptyTitle>
            <EmptyDescription>
              No General Education evaluation assignments in this scope.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref()} className={resetClass}>
              View all periods
            </Link>
          </EmptyContent>
        </Empty>
      ) : emptyReason === "no-submissions" ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No submitted responses</EmptyTitle>
            <EmptyDescription>Assignments exist, but no submitted responses yet.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref()} className={resetClass}>
              Clear period filter
            </Link>
          </EmptyContent>
        </Empty>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Submitted Responses", value: String(kpi.submittedResponseCount) },
          { label: "Opportunities", value: String(kpi.evaluationOpportunityCount) },
          {
            label: "Response Rate",
            value: kpi.responseRate === null ? "—" : `${(kpi.responseRate * 100).toFixed(1)}%`,
          },
          { label: "Rating Count", value: String(kpi.ratingCount) },
          {
            label: "Mean Rating",
            value: kpi.meanRating === null ? "—" : kpi.meanRating.toFixed(2),
          },
        ].map((card) => (
          <Card key={card.label} size="sm">
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs">{card.label}</p>
              <p className="text-xl font-semibold tabular-nums">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {kpi.evaluationOpportunityCount === 0 ? (
        <p className="text-body-sm text-text-secondary">
          No denominator exists for this scope — response rate is unavailable.
        </p>
      ) : null}

      {/* Course breakdowns */}
      {courseBreakdowns.length > 0 ? (
        <CourseBreakdownSection rows={courseBreakdowns} />
      ) : emptyReason === null ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No course breakdown</EmptyTitle>
            <EmptyDescription>
              No Course-bound General Education evidence to break down by course in this scope.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {/* Trends */}
      {trends.periods.length > 0 ? (
        <TrendsSection trends={trends} />
      ) : trends.emptyReason === "no-evidence" ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No trend evidence</EmptyTitle>
            <EmptyDescription>No periods with evidence to chart in this scope.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : trends.emptyReason === "no-comparable-history" ? (
        <TrendsSection trends={trends} />
      ) : null}

      {/* Qualitative feedback — aggregate only */}
      <FeedbackSection feedback={feedback} />
    </div>
  );
}

function Select({
  label,
  name,
  value,
  options,
  blankLabel,
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  blankLabel: string;
}) {
  if (options.length === 0) return null;
  // Native select keeps the GET form working without JS (progressive enhancement).
  // Keep h-11 for 44px touch target; shadcn Select would need hidden inputs for form submission.
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="border-border bg-background focus-visible:ring-ring h-11 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 pointer-coarse:min-h-11"
      >
        <option value="">{blankLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CourseBreakdownSection({
  rows,
}: {
  rows: GeneralEducationAnalyticsDTO["courseBreakdowns"];
}) {
  const data = rows.map((r) => ({ label: `${r.courseCode}`, value: r.meanRating }));
  const ranked = data.filter((d) => d.value !== null).sort((a, b) => b.value! - a.value!);
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `ge-course-${instanceId}`;
  const titleId = `${chartId}-title`;
  const chartData = data.map((d) => ({ ...d, chartValue: d.value ?? 0 }));
  return (
    <section aria-label="Course breakdown" className="space-y-3">
      <h2 className="text-title-sm text-foreground">Mean Rating by Course</h2>
      <p className="text-body-sm text-text-secondary">
        Cross-program Course-bound General Education evidence only.
      </p>
      {ranked.length > 0 ? (
        <>
          <div className="border-border h-72 w-full rounded-xl border p-3">
            <ChartContainer
              id={chartId}
              role="region"
              aria-labelledby={titleId}
              className="aspect-auto h-full w-full"
            >
              <BarChart data={chartData} margin={{ bottom: 10, left: 0, right: 0, top: 10 }}>
                <ChartPatternDefs chartId={chartId} categoryCount={data.length} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 12 }}
                />
                <YAxis domain={[0, "auto"]} tickLine={false} axisLine={false} />
                <ChartTooltip
                  formatter={(_value, _name, item) => {
                    const o = (item?.payload as { value: number | null } | undefined)?.value;
                    return [o == null ? "N/A" : o.toFixed(2), "Mean"];
                  }}
                />
                <Bar dataKey="chartValue" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {chartData.map((e, i) => (
                    <Cell
                      key={e.label}
                      fill={e.value === null ? "var(--muted)" : chartFill(chartId, i)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
          <div role="list" className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Chart legend">
            {data.map((e, i) => (
              <span role="listitem" key={e.label} className="flex items-center gap-1.5">
                <ChartSwatch fill={e.value === null ? "var(--muted)" : chartFill(chartId, i)} />
                <span className="text-muted-foreground text-xs">{e.label}</span>
              </span>
            ))}
          </div>
          <p className="text-body-sm text-text-secondary">
            {ranked.length === 1
              ? `${ranked[0].label}: ${ranked[0].value!.toFixed(2)}.`
              : `Highest mean: ${ranked[0].label} (${ranked[0].value!.toFixed(2)}). Lowest: ${ranked[ranked.length - 1].label} (${ranked[ranked.length - 1].value!.toFixed(2)}).`}
          </p>
        </>
      ) : null}
      <details>
        <summary className="text-text-secondary flex cursor-pointer items-center text-sm font-medium pointer-coarse:min-h-11">
          View exact values
        </summary>
        <div className="border-border mt-3 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Mean</TableHead>
                <TableHead className="text-right">Ratings</TableHead>
                <TableHead className="text-right">Responses</TableHead>
                <TableHead>Scale</TableHead>
                <TableHead>Instrument</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.courseId}>
                  <TableCell className="font-medium">
                    {r.courseCode} — {r.courseTitle}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {r.meanRating === null ? "N/A" : r.meanRating.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.ratingCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.submittedResponseCount}
                  </TableCell>
                  <TableCell className="text-xs">{r.scaleContext ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.instrumentContext ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </section>
  );
}

function TrendsSection({ trends }: { trends: GeneralEducationAnalyticsDTO["trends"] }) {
  const { periods, breaks } = trends;
  const runs = splitComparableRuns(periods);
  const chartable = periods.filter(
    (p): p is typeof p & { meanRating: number } => p.meanRating !== null
  );
  const hasDrawableRun = runs.some((r) => r.length >= 2);
  const instanceId = useId().replace(/[:]/g, "");
  const chartId = `ge-trend-${instanceId}`;
  if (chartable.length === 0 || !hasDrawableRun) {
    return (
      <section aria-label="Trends" className="space-y-3">
        <h2 className="text-title-sm text-foreground">Trends</h2>
        <p className="text-body-sm text-text-secondary">
          No comparable history to draw a trend line in this scope.
        </p>
        <TrendsTable periods={periods} breaks={breaks} />
      </section>
    );
  }
  const runIndexByLabel = new Map<string, number>();
  runs.forEach((run, idx) => {
    for (const pt of run) runIndexByLabel.set(pt.periodLabel, idx);
  });
  const data = chartable.map((p) => {
    const idx = runIndexByLabel.get(p.periodLabel) ?? 0;
    const row: Record<string, string | number | null> = { periodLabel: p.periodLabel };
    for (let i = 0; i < runs.length; i++) row[`run${i}`] = i === idx ? p.meanRating : null;
    return row;
  });
  const breakSet = new Set(breaks.map((b) => b.toPeriodLabel));
  const breakLabels = chartable
    .filter((p) => breakSet.has(p.periodLabel))
    .map((p) => p.periodLabel);
  return (
    <section aria-label="Trends" className="space-y-3">
      <h2 className="text-title-sm text-foreground">Trends</h2>
      <div className="border-border h-72 w-full rounded-xl border p-3">
        <ChartContainer id={chartId} role="region" className="aspect-auto h-full w-full">
          <LineChart data={data} margin={{ bottom: 10, left: 0, right: 0, top: 10 }}>
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
            <YAxis domain={[0, "auto"]} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <ChartTooltip formatter={(v) => [typeof v === "number" ? v.toFixed(2) : v, "Mean"]} />
            {breakLabels.map((label) => (
              <ReferenceLine
                key={label}
                x={label}
                stroke="var(--color-border)"
                strokeDasharray="4 4"
              />
            ))}
            {runs.map((run, i) => {
              const standalone = run.length < 2;
              const fill = standalone ? "var(--muted)" : chartFill(chartId, i);
              return (
                <Line
                  key={i}
                  type="linear"
                  dataKey={`run${i}`}
                  stroke={fill}
                  strokeWidth={2}
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
      {breaks.length > 0 ? (
        <div className="rounded-lg border border-dashed p-3">
          <h3 className="text-sm font-semibold">Comparability breaks</h3>
          <ul className="text-text-secondary mt-1.5 list-disc space-y-1 pl-5 text-sm">
            {breaks.map((b, i) => (
              <li key={i}>
                {b.fromPeriodLabel} → {b.toPeriodLabel}: {b.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <TrendsTable periods={periods} breaks={breaks} />
    </section>
  );
}

function TrendsTable({
  periods,
  breaks,
}: {
  periods: GeneralEducationAnalyticsDTO["trends"]["periods"];
  breaks: GeneralEducationAnalyticsDTO["trends"]["breaks"];
}) {
  return (
    <details>
      <summary className="text-text-secondary flex cursor-pointer items-center text-sm font-medium pointer-coarse:min-h-11">
        View exact values
      </summary>
      <div className="border-border mt-3 overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Mean</TableHead>
              <TableHead className="text-right">Ratings</TableHead>
              <TableHead className="text-right">Responses</TableHead>
              <TableHead>Comparable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((p) => (
              <TableRow key={p.termInstanceId}>
                <TableCell>{p.periodLabel}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.meanRating === null ? "N/A" : p.meanRating.toFixed(2)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{p.ratingCount}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.submittedResponseCount}
                </TableCell>
                <TableCell className="text-xs">{p.comparableWithPrevious ? "Yes" : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {breaks.length > 0 ? (
        <p className="text-body-sm text-text-secondary mt-2">
          {breaks.length} comparability break{breaks.length === 1 ? "" : "s"} — values joined only
          within comparable periods.
        </p>
      ) : null}
    </details>
  );
}

// fallow-ignore-next-line complexity
function FeedbackSection({ feedback }: { feedback: GeneralEducationAnalyticsDTO["feedback"] }) {
  const {
    emptyReason,
    tokens,
    qualitativeItemCount,
    qualitativeResponseCount,
    promptCounts,
    evidenceEvaluations,
    sourceLabel,
  } = feedback;
  const resetClass = cn(buttonVariants({ variant: "outline", size: "sm" }));
  if (emptyReason === "no-assignments") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardList aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No evaluation assignments</EmptyTitle>
          <EmptyDescription>
            No General Education evaluation assignments, so no feedback to summarize.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  if (emptyReason === "no-submissions") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardList aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No submitted responses</EmptyTitle>
          <EmptyDescription>Assignments exist, but no submitted responses yet.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href={resetHref()} className={resetClass}>
            Clear period filter
          </Link>
        </EmptyContent>
      </Empty>
    );
  }
  if (emptyReason === "no-qualitative-evidence") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageSquareText aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No qualitative evidence</EmptyTitle>
          <EmptyDescription>
            Submitted responses exist, but none include qualitative comments.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <section aria-label="Qualitative feedback" className="flex flex-col gap-4">
      <h2 className="text-title-sm text-foreground">Qualitative Feedback</h2>
      <p className="text-body-sm text-text-secondary">
        {sourceLabel} — aggregate tokens only; raw comments are never shown.
      </p>
      {tokens.length > 0 ? (
        <QualitativeWordCloud
          title="Frequent terms"
          tokens={tokens}
          responseCount={qualitativeResponseCount}
        />
      ) : (
        <Alert variant="information">
          <AlertTitle>No tokenizable terms</AlertTitle>
          <AlertDescription>
            Identifier redaction and filtering left no terms to display.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-3">
        <h3 className="text-title-sm text-foreground">Prompt counts</h3>
        <p className="text-body-sm text-text-secondary">
          {qualitativeItemCount} items from {qualitativeResponseCount} submitted{" "}
          {qualitativeResponseCount === 1 ? "response" : "responses"}
        </p>
        <div className="border-border overflow-x-auto rounded-lg border">
          <Table aria-label="Exact values: Prompt counts">
            <TableHeader>
              <TableRow>
                <TableHead>Prompt</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Responses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promptCounts.map((r) => (
                <TableRow key={`${r.sourceLabel}:${r.promptLabel}`}>
                  <TableCell className="font-medium">
                    {r.sourceLabel} — {r.promptLabel}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.itemCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.responseCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {evidenceEvaluations.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-title-sm text-foreground">Evidence links</h3>
          <ul className="flex flex-col gap-1">
            {evidenceEvaluations.map((ev) => (
              <li key={ev.evaluationId} className="text-muted-foreground text-sm">
                {ev.deploymentName}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
