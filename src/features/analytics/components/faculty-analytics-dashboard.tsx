"use client";

import { useEffect, useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Bot, CalendarDays, CheckCircle2, Filter, Info, RotateCcw } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QualitativeWordCloud } from "./qualitative-word-cloud";
import { generateFacultyAnalyticsInsightAction } from "@/lib/actions/faculty-analytics-actions";
import { cn } from "@/lib/utils";
import type {
  FacultyAnalyticsData,
  FacultyAnalyticsFilters,
  FacultyAnalyticsOptions,
  FacultyAnalyticsView,
  FacultyCiloMetric,
  FacultyScaleDistribution,
  FacultyTrendPoint,
} from "../types";
import type {
  FacultyAIInsight,
  FacultyAISectionInsight,
  GenerateFacultyAIInsightResult,
} from "../services/generate-faculty-analytics-insight";

const VIEW_LABELS: Record<FacultyAnalyticsView, string> = {
  overview: "Overview",
  cilos: "CILO results",
  questions: "Question results",
  trends: "Trends",
  qualitative: "Written feedback",
};

type Props = {
  data: FacultyAnalyticsData;
  options: FacultyAnalyticsOptions;
};

export function FacultyAnalyticsDashboard({ data, options }: Props) {
  const [aiResult, setAiResult] = useState<GenerateFacultyAIInsightResult | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (data.kpi.submittedResponseCount === 0) return;
    startTransition(async () =>
      setAiResult(await generateFacultyAnalyticsInsightAction(data.filters))
    );
  }, [data.filters, data.kpi.submittedResponseCount]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-heading-lg text-balance">My evaluation analytics</h1>
          <p className="text-body-md text-text-secondary mt-2 text-pretty">
            Review anonymous, combined results from evaluations for the classes you teach.
            Individual students and individual submissions are never shown.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit gap-1.5">
          <CheckCircle2 aria-hidden="true" className="size-3.5" /> Aggregate evidence only
        </Badge>
      </header>

      <ScopeFilters filters={data.filters} options={options} scopeLabel={data.scopeLabel} />
      <ViewNavigation filters={data.filters} />

      {data.evaluations.length === 0 ? (
        <NoEvidence filters={data.filters} />
      ) : (
        <>
          <KpiGrid data={data} />
          {data.filters.view === "overview" ? (
            <OverviewView
              data={data}
              ai={aiResult?.ok ? aiResult.data : null}
              aiState={aiResult}
              pending={isPending}
            />
          ) : null}
          {data.filters.view === "cilos" ? (
            <CiloView
              data={data}
              ai={aiResult?.ok ? aiResult.data.cilos : null}
              aiState={aiResult}
              pending={isPending}
            />
          ) : null}
          {data.filters.view === "questions" ? (
            <QuestionView
              data={data}
              ai={aiResult?.ok ? aiResult.data.questions : null}
              aiState={aiResult}
              pending={isPending}
            />
          ) : null}
          {data.filters.view === "trends" ? (
            <TrendsView
              data={data}
              ai={aiResult?.ok ? aiResult.data.trends : null}
              aiState={aiResult}
              pending={isPending}
            />
          ) : null}
          {data.filters.view === "qualitative" ? (
            <QualitativeView
              data={data}
              ai={aiResult?.ok ? aiResult.data.qualitative : null}
              aiState={aiResult}
              pending={isPending}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function ScopeFilters({
  filters,
  options,
  scopeLabel,
}: {
  filters: FacultyAnalyticsFilters;
  options: FacultyAnalyticsOptions;
  scopeLabel: string;
}) {
  const activeCount = [
    filters.termInstanceId,
    filters.courseId,
    filters.assignmentId,
    filters.evaluationId,
    filters.status,
  ].filter(Boolean).length;
  const form = <FilterForm filters={filters} options={options} />;

  return (
    <section
      className="border-border bg-card rounded-xl border shadow-xs"
      aria-labelledby="scope-title"
    >
      <div className="border-border/70 flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="scope-title" className="text-title-sm">
              Evidence scope
            </h2>
            <Badge variant="outline">
              {activeCount ? `${activeCount} active` : "All available evidence"}
            </Badge>
          </div>
          <p className="text-body-sm text-text-secondary mt-1">{scopeLabel}</p>
        </div>
        {activeCount ? (
          <Link
            href={analyticsHref({ view: filters.view })}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden lg:inline-flex"
            )}
          >
            <RotateCcw data-icon="inline-start" aria-hidden="true" /> Reset
          </Link>
        ) : null}
      </div>
      <div className="hidden p-4 sm:px-5 lg:block">{form}</div>
      <div className="p-3 lg:hidden">
        <Drawer showSwipeHandle>
          <DrawerTrigger
            render={<Button variant="outline" className="min-h-11 w-full justify-between" />}
          >
            <span className="flex items-center gap-2">
              <Filter aria-hidden="true" className="size-4" /> Scope filters
            </span>
            <span className="text-muted-foreground font-normal">
              {activeCount ? `${activeCount} active` : "All evidence"}
            </span>
          </DrawerTrigger>
          <DrawerContent className="max-h-[88dvh]">
            <DrawerHeader className="border-b pb-3 text-left">
              <DrawerTitle>Analytics scope filters</DrawerTitle>
              <DrawerDescription>
                Choose the class evidence you want to understand.
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {form}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </section>
  );
}

function FilterForm({
  filters,
  options,
}: {
  filters: FacultyAnalyticsFilters;
  options: FacultyAnalyticsOptions;
}) {
  const prefix = useId();
  const assignments = options.assignments.filter(
    (item) =>
      (!filters.courseId || item.courseId === filters.courseId) &&
      (!filters.termInstanceId || item.termInstanceId === filters.termInstanceId)
  );
  const evaluations = options.evaluations.filter(
    (item) =>
      (!filters.courseId || item.courseId === filters.courseId) &&
      (!filters.termInstanceId || item.termInstanceId === filters.termInstanceId) &&
      (!filters.assignmentId || item.assignmentId === filters.assignmentId)
  );
  return (
    <form
      method="get"
      action="/faculty/analytics"
      className="grid gap-4 lg:grid-cols-12 lg:items-end"
    >
      <input type="hidden" name="view" value={filters.view} />
      <FilterSelect
        id={`${prefix}-term`}
        name="termInstanceId"
        label="Academic term"
        value={filters.termInstanceId}
        blank="All academic terms"
        options={options.terms}
        className="lg:col-span-3"
      />
      <FilterSelect
        id={`${prefix}-course`}
        name="courseId"
        label="Course"
        value={filters.courseId}
        blank="All courses"
        options={options.courses}
        className="lg:col-span-3"
      />
      <FilterSelect
        id={`${prefix}-class`}
        name="assignmentId"
        label="Class"
        value={filters.assignmentId}
        blank="All classes"
        options={assignments}
        className="lg:col-span-3"
      />
      <FilterSelect
        id={`${prefix}-evaluation`}
        name="evaluationId"
        label="Evaluation"
        value={filters.evaluationId}
        blank="All evaluations"
        options={evaluations.map((item) => ({ id: item.id, label: item.deploymentName }))}
        className="lg:col-span-3"
      />
      <FilterSelect
        id={`${prefix}-status`}
        name="status"
        label="Status"
        value={filters.status}
        blank="Active and closed"
        options={[
          { id: "ACTIVE", label: "Active" },
          { id: "CLOSED", label: "Closed" },
        ]}
        className="lg:col-span-3"
      />
      <div className="flex gap-2 lg:col-span-9 lg:justify-end">
        <Button type="submit" className="min-h-11 flex-1 lg:min-h-8 lg:flex-none">
          Apply filters
        </Button>
        <Link
          href={analyticsHref({ view: filters.view })}
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11 lg:min-h-8")}
        >
          Reset
        </Link>
      </div>
    </form>
  );
}

function FilterSelect({
  id,
  name,
  label,
  value,
  blank,
  options,
  className,
}: {
  id: string;
  name: string;
  label: string;
  value?: string;
  blank: string;
  options: Array<{ id: string; label: string }>;
  className?: string;
}) {
  const items = [{ id: "", label: blank }, ...options];
  return (
    <Field className={cn("gap-1.5", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        name={name}
        defaultValue={value ?? ""}
        items={items.map((item) => ({ value: item.id, label: item.label }))}
      >
        <SelectTrigger id={id} className="min-h-11 w-full lg:min-h-8">
          <SelectValue placeholder={blank} />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.id || "all"} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function ViewNavigation({ filters }: { filters: FacultyAnalyticsFilters }) {
  return (
    <>
      <Tabs value={filters.view} className="hidden sm:block">
        <TabsList variant="line" aria-label="Analytics view">
          {Object.entries(VIEW_LABELS).map(([view, label]) => (
            <TabsTrigger
              key={view}
              value={view}
              nativeButton={false}
              render={
                <Link href={analyticsHref({ ...filters, view: view as FacultyAnalyticsView })} />
              }
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <MobileViewSelect filters={filters} />
    </>
  );
}

function MobileViewSelect({ filters }: { filters: FacultyAnalyticsFilters }) {
  const router = useRouter();
  return (
    <div className="sm:hidden">
      <Field className="gap-1.5">
        <FieldLabel htmlFor="analytics-view">Analytics view</FieldLabel>
        <Select
          value={filters.view}
          onValueChange={(value) => {
            if (value) {
              void router.push(analyticsHref({ ...filters, view: value as FacultyAnalyticsView }));
            }
          }}
          items={Object.entries(VIEW_LABELS).map(([value, label]) => ({ value, label }))}
        >
          <SelectTrigger id="analytics-view" className="min-h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(VIEW_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function KpiGrid({ data }: { data: FacultyAnalyticsData }) {
  const { kpi } = data;
  const mean = kpi.spansMultipleScales
    ? "Multiple scales"
    : kpi.overallMean === null
      ? "Unavailable"
      : `${kpi.overallMean.toFixed(2)}${kpi.overallScaleMax ? ` / ${kpi.overallScaleMax}` : ""}`;
  const cards = [
    [
      "Submitted responses",
      kpi.submittedResponseCount.toLocaleString(),
      "Completed submissions in this scope",
    ],
    [
      "Response rate",
      kpi.responseRate === null ? "Unavailable" : `${(kpi.responseRate * 100).toFixed(1)}%`,
      `${kpi.submittedResponseCount} of ${kpi.opportunityCount} opportunities`,
    ],
    ["Valid ratings", kpi.validRatingCount.toLocaleString(), "Rating answers used in calculations"],
    ["Overall mean", mean, kpi.overallScaleLabel ?? "Shown only for one compatible rating scale"],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, description]) => (
        <Card key={label} size="sm">
          <CardHeader>
            <CardDescription>{label}</CardDescription>
            <CardTitle className="text-heading-xl tabular-nums">{value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm text-text-secondary">{description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OverviewView({
  data,
  ai,
  aiState,
  pending,
}: {
  data: FacultyAnalyticsData;
  ai: FacultyAIInsight | null;
  aiState: GenerateFacultyAIInsightResult | null;
  pending: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <EvidenceCard
        title="Participation by evaluation"
        description="Submitted responses compared with every evaluation opportunity."
      >
        <div className="flex flex-col gap-4">
          {data.evaluations.map((item) => {
            const rate = item.opportunityCount ? item.responseCount / item.opportunityCount : null;
            return (
              <div key={item.id} className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium">{item.deploymentName}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.courseCode} · {item.classLabel}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums">
                    {item.responseCount} / {item.opportunityCount}
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-chart-1 h-full rounded-full"
                    style={{ width: `${rate === null ? 0 : Math.round(rate * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <PlainSummary>
          {data.kpi.responseRate === null
            ? "No evaluation opportunities exist in this scope."
            : `${data.kpi.submittedResponseCount} of ${data.kpi.opportunityCount} evaluation opportunities produced submitted responses.`}
        </PlainSummary>
        <AIOverview
          insight={ai?.participation ?? null}
          state={aiState}
          pending={pending}
          data={data}
        />
      </EvidenceCard>
      <EvidenceCard
        title="Rating distribution"
        description="How valid rating answers are distributed on each published scale."
      >
        <DistributionGroups groups={data.ratingDistributions} />
        <PlainSummary>{distributionSummary(data.ratingDistributions)}</PlainSummary>
        <AIOverview insight={ai?.ratings ?? null} state={aiState} pending={pending} data={data} />
      </EvidenceCard>
      <ClassSummary data={data} />
    </div>
  );
}

function CiloView({
  data,
  ai,
  aiState,
  pending,
}: {
  data: FacultyAnalyticsData;
  ai: FacultyAISectionInsight | null;
  aiState: GenerateFacultyAIInsightResult | null;
  pending: boolean;
}) {
  const metrics = data.ciloMetrics.filter((metric) => metric.scaleGroups.length > 0);
  const courseGroups = groupCiloMetrics(metrics);
  return (
    <EvidenceCard
      title="CILO ratings"
      description="Student ratings for each Course Intended Learning Outcome, organized by course and evaluation. These are evaluation results, not mastery grades."
    >
      <p className="text-body-sm text-text-secondary">
        This view includes only questions bound to a CILO, so its rating totals may be lower than
        the all-question KPI above.
      </p>
      {courseGroups.length ? (
        <div className="flex flex-col gap-8">
          {courseGroups.map((courseGroup) => (
            <section
              key={courseGroup.key}
              aria-labelledby={`cilo-course-${courseGroup.key}`}
              className="min-w-0"
            >
              <header className="bg-brand-accent-soft border-brand-accent-border flex flex-col gap-2 rounded-lg border px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-brand-accent-soft text-brand-accent dark:text-brand-accent-highlight border-brand-accent-border border tabular-nums">
                      {courseGroup.courseCode}
                    </Badge>
                    <h3 id={`cilo-course-${courseGroup.key}`} className="text-title-md break-words">
                      {courseGroup.courseTitle}
                    </h3>
                  </div>
                  <p className="text-body-sm text-text-secondary mt-1 break-words">
                    {courseGroup.evaluationName}
                  </p>
                </div>
                <p className="text-caption text-text-muted shrink-0 tabular-nums">
                  {courseGroup.metrics.length} outcome
                  {courseGroup.metrics.length === 1 ? "" : "s"}
                </p>
              </header>
              <div className="divide-border mt-1 divide-y">
                {courseGroup.metrics.map((metric) => (
                  <CiloMetricRow key={metric.key} metric={metric} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <NoMetric
          title="No CILO rating evidence"
          description="Published CILO bindings have no valid ratings in this scope."
        />
      )}
      <PlainSummary>
        {rankedSummary(
          metrics.map((metric) => ({
            label: `${metric.courseCode} ${metric.label}`,
            mean: metric.scaleGroups.length === 1 ? metric.scaleGroups[0].mean : null,
          })),
          "CILO"
        )}
      </PlainSummary>
      <AIOverview insight={ai} state={aiState} pending={pending} data={data} />
      <ExactCiloTable data={data} />
    </EvidenceCard>
  );
}

function CiloMetricRow({ metric }: { metric: FacultyCiloMetric }) {
  const group = metric.scaleGroups.length === 1 ? metric.scaleGroups[0] : null;
  const position =
    group?.mean === null || !group
      ? 0
      : ((group.mean - group.scaleMin) / Math.max(1, group.scaleMax - group.scaleMin)) * 100;
  return (
    <div className="grid min-w-0 gap-4 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,1fr)_5rem] lg:items-center lg:gap-6">
      <div className="min-w-0">
        <p className="text-label-lg">{metric.label}</p>
        <p className="text-body-sm text-text-secondary mt-1 text-pretty break-words">
          {metric.description}
        </p>
      </div>
      {group ? (
        <div className="min-w-0 px-2 pb-4 lg:px-0">
          <div className="relative h-6" aria-hidden="true">
            <div className="bg-muted absolute inset-x-0 top-2 h-1.5 rounded-full" />
            <div
              className="bg-chart-2 ring-card absolute top-0 size-5 -translate-x-1/2 rounded-full ring-4"
              style={{
                left: `clamp(0.625rem, ${position}%, calc(100% - 0.625rem))`,
              }}
            />
            <div className="text-caption text-text-muted mt-5 flex justify-between tabular-nums">
              <span>{group.scaleMin}</span>
              <span>{group.scaleMax}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-body-sm text-text-secondary">Multiple rating scales</p>
      )}
      <div className="flex items-baseline justify-between gap-3 lg:block lg:text-right">
        <p className="text-caption text-text-muted lg:hidden">Mean rating</p>
        <div>
          <p className="text-title-lg tabular-nums">{group?.mean?.toFixed(2) ?? "—"}</p>
          <p className="text-caption text-text-muted">
            {group?.ratingCount ?? 0} rating{group?.ratingCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </div>
  );
}

function groupCiloMetrics(metrics: FacultyCiloMetric[]) {
  return Array.from(
    metrics
      .reduce(
        (groups, metric) => {
          const key = `${metric.courseId}-${metric.evaluationId}`;
          const existing = groups.get(key);
          if (existing) existing.metrics.push(metric);
          else
            groups.set(key, {
              key,
              courseCode: metric.courseCode,
              courseTitle: metric.courseTitle,
              evaluationName: metric.evaluationName,
              metrics: [metric],
            });
          return groups;
        },
        new Map<
          string,
          {
            key: string;
            courseCode: string;
            courseTitle: string;
            evaluationName: string;
            metrics: FacultyCiloMetric[];
          }
        >()
      )
      .values()
  );
}

function QuestionView({
  data,
  ai,
  aiState,
  pending,
}: {
  data: FacultyAnalyticsData;
  ai: FacultyAISectionInsight | null;
  aiState: GenerateFacultyAIInsightResult | null;
  pending: boolean;
}) {
  return (
    <EvidenceCard
      title="Question results"
      description="Exact rating distributions for each quantitative question, grouped by instrument section."
    >
      {data.questionMetrics.length ? (
        <div className="flex flex-col gap-6">
          {data.questionMetrics.map((question) => (
            <div
              key={question.key}
              className="flex flex-col gap-3 border-b pb-5 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {question.sectionTitle}
                  {question.ciloLabel ? ` · ${question.ciloLabel}` : ""}
                </p>
                <h3 className="text-body-md mt-1 font-medium text-pretty">{question.prompt}</h3>
              </div>
              <DistributionGroups groups={question.scaleGroups} compact />
            </div>
          ))}
        </div>
      ) : (
        <NoMetric
          title="No quantitative questions"
          description="No valid quantitative question evidence exists in this scope."
        />
      )}
      <PlainSummary>
        {rankedSummary(
          data.questionMetrics.map((metric) => ({
            label: metric.prompt,
            mean: metric.scaleGroups.length === 1 ? metric.scaleGroups[0].mean : null,
          })),
          "question"
        )}
      </PlainSummary>
      <AIOverview insight={ai} state={aiState} pending={pending} data={data} />
    </EvidenceCard>
  );
}

function TrendsView({
  data,
  ai,
  aiState,
  pending,
}: {
  data: FacultyAnalyticsData;
  ai: FacultyAISectionInsight | null;
  aiState: GenerateFacultyAIInsightResult | null;
  pending: boolean;
}) {
  const chartable = data.trends.filter((point) => point.mean !== null);
  const courseCount = new Set(chartable.map((point) => point.courseId)).size;
  return (
    <EvidenceCard
      title="Comparable course trends"
      description="Mean ratings connect only when the same course, instrument version, and rating scale remain comparable."
    >
      {chartable.length >= 2 && courseCount === 1 ? (
        (() => {
          const runs: FacultyTrendPoint[][] = [];
          let current: FacultyTrendPoint[] = [];
          for (const point of chartable) {
            if (current.length > 0 && !point.comparableWithPrevious) {
              runs.push(current);
              current = [];
            }
            current.push(point);
          }
          if (current.length > 0) runs.push(current);
          const rows = chartable.map((point) => ({ periodLabel: point.periodLabel }));
          runs.forEach((run, runIndex) => {
            for (const point of run) {
              const row = rows.find((r) => r.periodLabel === point.periodLabel)!;
              (row as Record<string, unknown>)[`run${runIndex}`] = point.mean;
            }
          });
          return (
            <ChartContainer
              role="region"
              aria-label="Course rating trend"
              className="aspect-auto h-72 w-full"
            >
              <LineChart data={rows}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="periodLabel" tickLine={false} axisLine={false} />
                <YAxis
                  domain={["dataMin - 0.25", "dataMax + 0.25"]}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  formatter={(value) => [
                    typeof value === "number" ? value.toFixed(2) : value,
                    "Mean",
                  ]}
                />
                {runs.map((run, runIndex) => (
                  <Line
                    key={runIndex}
                    type="linear"
                    dataKey={`run${runIndex}`}
                    stroke={
                      runs.length === 1 ? "var(--chart-1)" : `var(--chart-${(runIndex % 5) + 1})`
                    }
                    strokeWidth={2}
                    dot={{
                      r: 4,
                      fill:
                        runs.length === 1 ? "var(--chart-1)" : `var(--chart-${(runIndex % 5) + 1})`,
                    }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          );
        })()
      ) : (
        <NoMetric
          title={
            courseCount > 1 ? "Choose one course to view a trend" : "Not enough comparable periods"
          }
          description={
            courseCount > 1
              ? "Course trends never combine unrelated courses. Select one course in Evidence scope."
              : "At least two comparable rated periods are needed to draw a trend."
          }
        />
      )}
      {data.trends.some((point) => point.breakReason) ? (
        <Alert variant="information">
          <Info aria-hidden="true" />
          <AlertTitle>Comparability breaks</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-5">
              {data.trends
                .filter((point) => point.breakReason)
                .map((point) => (
                  <li key={point.key}>
                    {point.periodLabel}: {point.breakReason}
                  </li>
                ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      <PlainSummary>
        {chartable.length
          ? `This scope contains ${chartable.length} rated period${chartable.length === 1 ? "" : "s"}. Lines are not joined across instrument or scale changes.`
          : "No trend can be calculated from this scope."}
      </PlainSummary>
      <AIOverview insight={ai} state={aiState} pending={pending} data={data} />
      <TrendTable data={data} />
    </EvidenceCard>
  );
}

function QualitativeView({
  data,
  ai,
  aiState,
  pending,
}: {
  data: FacultyAnalyticsData;
  ai: FacultyAISectionInsight | null;
  aiState: GenerateFacultyAIInsightResult | null;
  pending: boolean;
}) {
  if (!data.qualitative.available)
    return (
      <Alert variant="information">
        <Info aria-hidden="true" />
        <AlertTitle>Written-feedback analytics are protected</AlertTitle>
        <AlertDescription>
          Written-feedback analytics will appear after enough responses are received to protect
          respondent confidentiality. Quantitative analytics remain available.
        </AlertDescription>
      </Alert>
    );
  return (
    <div className="flex flex-col gap-6">
      <QualitativeWordCloud
        title="Common terms in written feedback"
        tokens={data.qualitative.tokens}
        answerCount={data.qualitative.itemCount}
      />
      <Alert variant="information">
        <Info aria-hidden="true" />
        <AlertTitle>How to read this</AlertTitle>
        <AlertDescription>
          Larger words were mentioned more often. A mention is not the number of students who used
          the word, and word frequency does not determine whether feedback was positive or negative.
        </AlertDescription>
      </Alert>
      <AIOverview insight={ai} state={aiState} pending={pending} data={data} qualitative />
      <PromptCountTable data={data} />
    </div>
  );
}

function EvidenceCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-title-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">{children}</CardContent>
    </Card>
  );
}

function DistributionGroups({
  groups,
  compact = false,
}: {
  groups: FacultyScaleDistribution[];
  compact?: boolean;
}) {
  if (!groups.length)
    return (
      <NoMetric
        title="No valid ratings"
        description="No ratings with a resolvable published scale exist in this scope."
      />
    );
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.scaleKey} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-label-md font-medium">{group.scaleLabel}</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {group.ratingCount} ratings · mean {group.mean?.toFixed(2) ?? "—"}
            </span>
          </div>
          <div
            className={cn("flex h-10 overflow-hidden rounded-lg", compact && "h-7")}
            role="img"
            aria-label={`${group.scaleLabel} rating distribution`}
          >
            {group.categories.map((category, index) => (
              <div
                key={category.value}
                className="min-w-0"
                style={{
                  width: `${category.percentage * 100}%`,
                  backgroundColor: `var(--chart-${(index % 5) + 1})`,
                }}
                title={`${category.label}: ${category.count} (${(category.percentage * 100).toFixed(1)}%)`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {group.categories.map((category, index) => (
              <span
                key={category.value}
                className="text-muted-foreground flex items-center gap-1.5 text-xs"
              >
                <span
                  className="size-2 rounded-[2px]"
                  style={{ backgroundColor: `var(--chart-${(index % 5) + 1})` }}
                />
                {category.label}: {category.count} ({(category.percentage * 100).toFixed(1)}%)
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AIOverview({
  insight,
  state,
  pending,
  data,
  qualitative = false,
}: {
  insight: FacultyAISectionInsight | null;
  state: GenerateFacultyAIInsightResult | null;
  pending: boolean;
  data: FacultyAnalyticsData;
  qualitative?: boolean;
}) {
  const basis = qualitative
    ? `${data.qualitative.itemCount} anonymous written answers`
    : `${data.kpi.submittedResponseCount} submitted responses and ${data.kpi.validRatingCount} valid ratings`;
  if (pending)
    return (
      <div
        className="bg-information-soft border-information/25 rounded-lg border p-4"
        role="status"
      >
        <div className="flex items-center gap-2 font-medium">
          <Bot aria-hidden="true" className="size-4" />
          Preparing AI overview
        </div>
        <p className="text-body-sm text-text-secondary mt-1">
          The verified chart remains available while System CLOIE interprets this scope.
        </p>
      </div>
    );
  if (insight)
    return (
      <div className="bg-information-soft border-information/25 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <Bot aria-hidden="true" className="size-4" />
          <h3 className="text-label-lg">AI-generated overview</h3>
        </div>
        <p className="text-body-md mt-2">{insight.observation}</p>
        <p className="text-body-sm mt-3">
          <span className="font-semibold">Worth checking:</span> {insight.worthChecking}
        </p>
        <p className="text-muted-foreground mt-3 text-xs">
          Based on {basis}. AI can be wrong. Use the chart and exact values as the evidence.
        </p>
        {qualitative ? (
          <p className="text-muted-foreground mt-2 text-xs">
            Based on anonymous aggregate counts and redacted term frequencies. It does not read or
            display individual student responses and may miss context, sarcasm, or uncommon
            feedback.
          </p>
        ) : null}
      </div>
    );
  const failure = state && !state.ok ? state.state : null;
  const label =
    !failure || failure === "disabled"
      ? "AI overview is not enabled for this deployment."
      : failure === "insufficient-evidence"
        ? "There is not enough combined evidence for a responsible AI overview."
        : "The AI overview is temporarily unavailable. The verified analytics above are unaffected.";
  return (
    <div className="border-border rounded-lg border border-dashed p-4">
      <div className="flex items-center gap-2 font-medium">
        <Bot aria-hidden="true" className="size-4" />
        AI-generated overview
      </div>
      <p className="text-body-sm text-text-secondary mt-1">{label}</p>
    </div>
  );
}

function PlainSummary({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-muted rounded-lg p-3">
      <p className="text-label-sm mb-1 font-semibold">What this shows</p>
      <p className="text-body-sm text-text-secondary">{children}</p>
    </div>
  );
}
function NoMetric({ title, description }: { title: string; description: string }) {
  return (
    <Empty className="py-8">
      <EmptyMedia variant="icon">
        <BarChart3 aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
    </Empty>
  );
}

function ClassSummary({ data }: { data: FacultyAnalyticsData }) {
  return (
    <div className="min-w-0 xl:col-span-2">
      <EvidenceCard
        title="Class summary"
        description="Exact participation by faculty-owned Course Assignment."
      >
        <div className="overflow-x-auto">
          <Table aria-label="Class evidence summary">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%] min-w-56">Evaluation</TableHead>
                <TableHead className="w-[24%] min-w-44">Class</TableHead>
                <TableHead className="w-[20%] min-w-36">Academic term</TableHead>
                <TableHead className="w-[8%] text-right">Responses</TableHead>
                <TableHead className="w-[8%] text-right">Rate</TableHead>
                <TableHead className="w-[10%]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.evaluations.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={analyticsHref({ ...data.filters, evaluationId: item.id })}
                      className="text-link font-medium underline underline-offset-3"
                    >
                      {item.deploymentName}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      {item.courseCode} · {item.courseTitle}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-normal">{item.classLabel}</TableCell>
                  <TableCell className="whitespace-normal">{item.termInstanceLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.responseCount} / {item.opportunityCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.opportunityCount
                      ? `${((item.responseCount / item.opportunityCount) * 100).toFixed(1)}%`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{titleCase(item.status)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </EvidenceCard>
    </div>
  );
}
function ExactCiloTable({ data }: { data: FacultyAnalyticsData }) {
  const rows = data.ciloMetrics.flatMap((metric) =>
    metric.scaleGroups.map((group) => ({ metric, group }))
  );
  return (
    <section aria-labelledby="exact-cilo-values-title" className="min-w-0">
      <div className="mb-3">
        <h3 id="exact-cilo-values-title" className="text-title-sm">
          Exact CILO values
        </h3>
        <p className="text-body-sm text-text-secondary mt-1">
          The same course-grouped results in a compact reference format.
        </p>
      </div>
      <div className="grid gap-3 sm:hidden">
        {rows.map(({ metric, group }) => (
          <article
            key={`${metric.key}:${group.scaleKey}:mobile`}
            className="border-border rounded-lg border p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-label-md tabular-nums">
                  {metric.courseCode} · {metric.label}
                </p>
                <p className="text-body-sm text-text-secondary mt-1 break-words">
                  {metric.description}
                </p>
              </div>
              <p className="text-title-md shrink-0 tabular-nums">{group.mean?.toFixed(2) ?? "—"}</p>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-caption text-text-muted">Scale</dt>
                <dd>{group.scaleLabel}</dd>
              </div>
              <div className="text-right">
                <dt className="text-caption text-text-muted">Ratings</dt>
                <dd className="tabular-nums">{group.ratingCount}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-caption text-text-muted">Bound question</dt>
                <dd className="text-body-sm mt-0.5 break-words">{metric.questionPrompt}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <Table aria-label="Exact CILO rating values">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-44">Course</TableHead>
              <TableHead className="min-w-64">CILO</TableHead>
              <TableHead className="min-w-64">Bound question</TableHead>
              <TableHead className="min-w-32">Scale</TableHead>
              <TableHead className="text-right">Mean</TableHead>
              <TableHead className="text-right">Ratings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ metric, group }) => (
              <TableRow key={`${metric.key}:${group.scaleKey}`}>
                <TableCell className="align-top whitespace-normal">
                  <span className="font-semibold tabular-nums">{metric.courseCode}</span>
                  <span className="text-text-secondary block text-sm">{metric.courseTitle}</span>
                  <span className="text-text-muted mt-1 block text-xs">
                    {metric.evaluationName}
                  </span>
                </TableCell>
                <TableCell className="align-top whitespace-normal">
                  <span className="font-medium">{metric.label}</span>
                  <span className="text-text-secondary block text-sm">{metric.description}</span>
                </TableCell>
                <TableCell className="align-top whitespace-normal">
                  {metric.questionPrompt}
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">{group.scaleLabel}</TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {group.mean?.toFixed(2) ?? "—"}
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {group.ratingCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
function TrendTable({ data }: { data: FacultyAnalyticsData }) {
  return (
    <div className="overflow-x-auto">
      <Table aria-label="Exact course trend values">
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Scale</TableHead>
            <TableHead className="text-right">Mean</TableHead>
            <TableHead className="text-right">Responses</TableHead>
            <TableHead>Comparable</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.trends.map((point) => (
            <TableRow key={point.key}>
              <TableCell>{point.courseCode}</TableCell>
              <TableCell>{point.periodLabel}</TableCell>
              <TableCell>{point.scaleLabel ?? "Unavailable"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {point.mean?.toFixed(2) ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">{point.responseCount}</TableCell>
              <TableCell>{point.comparableWithPrevious ? "Yes" : point.breakReason}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
function PromptCountTable({ data }: { data: FacultyAnalyticsData }) {
  return (
    <EvidenceCard
      title="Feedback coverage"
      description={`${data.qualitative.itemCount} non-empty written answers from ${data.qualitative.responseCount} submitted responses across ${data.qualitative.evaluationCount} evaluations.`}
    >
      <div className="overflow-x-auto">
        <Table aria-label="Written feedback counts by prompt">
          <TableHeader>
            <TableRow>
              <TableHead>Prompt</TableHead>
              <TableHead className="text-right">Written answers</TableHead>
              <TableHead className="text-right">Responses</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.qualitative.promptCounts.map((row) => (
              <TableRow key={row.prompt}>
                <TableCell className="whitespace-normal">{row.prompt}</TableCell>
                <TableCell className="text-right tabular-nums">{row.itemCount}</TableCell>
                <TableCell className="text-right tabular-nums">{row.responseCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </EvidenceCard>
  );
}
function NoEvidence({ filters }: { filters: FacultyAnalyticsFilters }) {
  return (
    <Empty className="border-border rounded-xl border py-16">
      <EmptyMedia variant="icon">
        <CalendarDays aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>No evaluation evidence in this scope</EmptyTitle>
      <EmptyDescription>
        Try clearing the filters. Analytics appears after a Course-bound evaluation for one of your
        classes receives submitted responses.
      </EmptyDescription>
      <EmptyContent>
        <Link
          href={analyticsHref({ view: filters.view })}
          className={buttonVariants({ variant: "outline" })}
        >
          Clear filters
        </Link>
      </EmptyContent>
    </Empty>
  );
}

function analyticsHref(filters: Partial<FacultyAnalyticsFilters>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && !(key === "view" && value === "overview")) params.set(key, value);
  });
  const query = params.toString();
  return `/faculty/analytics${query ? `?${query}` : ""}`;
}
function titleCase(value: string) {
  return value.toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}
function distributionSummary(groups: FacultyScaleDistribution[]) {
  if (!groups.length) return "No valid ratings are available.";
  if (groups.length > 1)
    return `${groups.length} incompatible rating scales are shown separately. Their means are never combined.`;
  const group = groups[0];
  const top = [...group.categories].sort((a, b) => b.count - a.count)[0];
  return `${group.ratingCount} valid ratings use the ${group.scaleLabel} scale. The most selected category is ${top?.label ?? "unavailable"} (${top?.count ?? 0}).`;
}
function rankedSummary(rows: Array<{ label: string; mean: number | null }>, noun: string) {
  const rated = rows
    .filter((row): row is { label: string; mean: number } => row.mean !== null)
    .sort((a, b) => b.mean - a.mean);
  if (!rated.length) return `No ${noun} means are available.`;
  if (rated.length === 1)
    return `${rated[0].label} has a mean rating of ${rated[0].mean.toFixed(2)}.`;
  const highestMean = rated[0].mean;
  const lowestMean = rated[rated.length - 1].mean;
  const highest = rated.filter((row) => row.mean === highestMean).map((row) => row.label);
  const lowest = rated.filter((row) => row.mean === lowestMean).map((row) => row.label);
  const highestLabel = highest.length === 1 ? highest[0] : `${highest.length} ${noun}s`;
  const lowestLabel = lowest.length === 1 ? lowest[0] : `${lowest.length} ${noun}s`;
  const highVerb = highest.length === 1 ? "belongs to" : "is shared by";
  const lowVerb = lowest.length === 1 ? "belongs to" : "is shared by";
  return `The highest ${noun} mean ${highVerb} ${highestLabel} (${highestMean.toFixed(2)}). The lowest ${lowVerb} ${lowestLabel} (${lowestMean.toFixed(2)}).`;
}
