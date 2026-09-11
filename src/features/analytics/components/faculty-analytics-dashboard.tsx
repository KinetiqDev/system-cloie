"use client";

import { useEffect, useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Filter,
  Info,
  RotateCcw,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ViewTabs } from "@/components/layout/view-tabs";
import { QualitativeWordCloud } from "./qualitative-word-cloud";
import { QualitativeTermChips, QualitativeToneSummary } from "./qualitative-evidence";
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
import type { DeploymentStatus } from "@prisma/client";
import { formatResponseStatus, responseStatusVariant } from "../program-head-responses-labels";
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

// Dashboard composes scoped header, scope filters, 5 evidence views, and empty state in one
// workspace contract; splitting view routing would scatter the aggregate-only scope sentence.
// fallow-ignore-next-line complexity
export function FacultyAnalyticsDashboard({ data, options }: Props) {
  const [aiResult, setAiResult] = useState<GenerateFacultyAIInsightResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const scopedEvaluation = data.filters.evaluationId
    ? (options.evaluations.find((item) => item.id === data.filters.evaluationId) ?? null)
    : null;

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
          {scopedEvaluation ? (
            <Breadcrumbs
              className="mb-3"
              items={[
                {
                  label: "My evaluation analytics",
                  href: analyticsHref({ ...data.filters, evaluationId: undefined }),
                },
                { label: scopedEvaluation.deploymentName },
              ]}
            />
          ) : null}
          <h1 className="text-heading-lg text-balance">
            {scopedEvaluation ? scopedEvaluation.deploymentName : "My evaluation analytics"}
          </h1>
          <p className="text-body-md text-text-secondary mt-2 text-pretty">
            {scopedEvaluation
              ? "Aggregated results for this evaluation across the classes you teach."
              : "Review anonymous, combined results from evaluations for the classes you teach. Individual students and individual submissions are never shown."}
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
  const deploymentNameCounts = new Map<string, number>();
  for (const item of options.evaluations) {
    deploymentNameCounts.set(
      item.deploymentName,
      (deploymentNameCounts.get(item.deploymentName) ?? 0) + 1
    );
  }
  const evaluations = options.evaluations
    .filter(
      (item) =>
        (!filters.courseId || item.courseId === filters.courseId) &&
        (!filters.termInstanceId || item.termInstanceId === filters.termInstanceId) &&
        (!filters.assignmentId || item.assignmentId === filters.assignmentId)
    )
    .map((item) => ({
      id: item.id,
      label:
        (deploymentNameCounts.get(item.deploymentName) ?? 0) > 1
          ? `${item.deploymentName} · ${item.classLabel} · ${item.termInstanceLabel}`
          : item.deploymentName,
    }));
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
        options={evaluations}
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
      <ViewTabs
        label="Analytics view"
        activeValue={filters.view}
        className="hidden sm:flex"
        items={Object.entries(VIEW_LABELS).map(([view, label]) => ({
          value: view,
          label,
          href: analyticsHref({ ...filters, view: view as FacultyAnalyticsView }),
        }))}
      />
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
        <AIOverview insight={ai?.overview ?? null} state={aiState} pending={pending} data={data} />
      </EvidenceCard>
      <EvidenceCard
        title="Rating distribution"
        description="How valid rating answers are distributed on each published scale."
      >
        <DistributionGroups groups={data.ratingDistributions} />
        <PlainSummary>{distributionSummary(data.ratingDistributions)}</PlainSummary>
        <AIOverview insight={ai?.overview ?? null} state={aiState} pending={pending} data={data} />
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
              <div className="mt-4 flex min-w-0 flex-col gap-2">
                <CiloGroupChart courseGroup={courseGroup} />
                <div className="divide-border divide-y">
                  {courseGroup.metrics.map((metric) => (
                    <CiloEvidenceRow key={metric.key} metric={metric} />
                  ))}
                </div>
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
// One horizontal-bar chart per course group keeps every CILO mean on the fixed 1-5
// rating scale; the evidence list below preserves each outcome's exact mean text.
function CiloGroupChart({
  courseGroup,
}: {
  courseGroup: {
    key: string;
    courseCode: string;
    courseTitle: string;
    evaluationName: string;
    metrics: FacultyCiloMetric[];
  };
}) {
  const rows = courseGroup.metrics.flatMap((metric) => {
    const group = metric.scaleGroups.length === 1 ? metric.scaleGroups[0] : null;
    if (!group || group.mean === null) return [];
    return [{ label: metric.label, mean: group.mean, ratingCount: group.ratingCount }];
  });
  if (!rows.length) {
    return (
      <p className="text-body-sm text-text-secondary">
        Mean ratings cannot be charted for this group: every outcome spans multiple rating scales or
        has no resolvable mean.
      </p>
    );
  }
  return (
    <ChartContainer
      role="region"
      aria-label={`Mean CILO ratings for ${courseGroup.courseCode}, ${courseGroup.evaluationName}`}
      className="aspect-auto w-full"
      style={{ height: Math.max(180, rows.length * 56 + 72) }}
    >
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          tickLine={false}
          axisLine={false}
        />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={80} />
        <ChartTooltip
          formatter={(value) => [typeof value === "number" ? value.toFixed(2) : value, "Mean"]}
        />
        <Bar
          dataKey="mean"
          name="Mean"
          fill="var(--chart-2)"
          radius={[0, 6, 6, 0]}
          barSize={22}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}

function CiloEvidenceRow({ metric }: { metric: FacultyCiloMetric }) {
  const group = metric.scaleGroups.length === 1 ? metric.scaleGroups[0] : null;
  return (
    <div className="flex min-w-0 flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-label-lg">{metric.label}</p>
        <p className="text-body-sm text-text-secondary mt-1 text-pretty break-words">
          {metric.description}
        </p>
      </div>
      <p className="text-body-sm text-text-secondary shrink-0 tabular-nums">
        {group
          ? `${group.mean?.toFixed(2) ?? "—"} mean · ${group.ratingCount} rating${group.ratingCount === 1 ? "" : "s"}`
          : "Multiple rating scales"}
      </p>
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
  const ratedQuestions = data.questionMetrics.filter((question) =>
    question.scaleGroups.some((group) => group.ratingCount > 0)
  );
  const unratedQuestions = data.questionMetrics.filter(
    (question) => !question.scaleGroups.some((group) => group.ratingCount > 0)
  );
  return (
    <EvidenceCard
      title="Question results"
      description="Exact rating distributions for each quantitative question, grouped by instrument section."
    >
      {ratedQuestions.length ? (
        <div className="flex flex-col gap-6">
          {ratedQuestions.map((question) => (
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
      {unratedQuestions.length ? (
        <Collapsible className="border-border rounded-lg border">
          <CollapsibleTrigger
            render={<Button variant="ghost" className="group min-h-11 w-full justify-between" />}
          >
            <span className="font-medium">
              Show {unratedQuestions.length} unrated question
              {unratedQuestions.length === 1 ? "" : "s"}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-data-panel-open:rotate-180 motion-reduce:transition-none"
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden border-t transition-[height] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
            <ul className="flex flex-col gap-3 px-4 py-4">
              {unratedQuestions.map((question) => (
                <li key={question.key} className="min-w-0">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {question.sectionTitle}
                    {question.ciloLabel ? ` · ${question.ciloLabel}` : ""}
                  </p>
                  <p className="text-body-sm mt-0.5 text-pretty">{question.prompt}</p>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
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
      <QualitativeToneSummary tone={data.qualitative.tone} />
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

// Pending/insight/disabled/insufficient/timeout states with qualitative disclaimer are one
// AI-state contract that never blocks deterministic evidence; splitting would scatter it.
// fallow-ignore-next-line complexity
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
        className="bg-information-soft border-information/25 min-h-36 rounded-lg border p-4"
        role="status"
        aria-label="Generating AI insight"
        aria-busy="true"
      >
        <div className="flex items-center gap-2 font-medium">
          <Bot aria-hidden="true" className="size-4" />
          Interpreting this evidence
        </div>
        <p className="text-body-sm text-text-secondary mt-1">
          System CLOIE is preparing an AI-generated overview. The verified analytics remain
          available while this finishes.
        </p>
        <div className="mt-4 flex flex-col gap-2" aria-hidden="true">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[88%]" />
          <Skeleton className="h-3 w-[64%]" />
        </div>
      </div>
    );
  if (insight)
    return (
      <div className="bg-information-soft border-information/25 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Bot aria-hidden="true" className="size-4" />
          <h3 className="text-label-lg">AI-generated insight</h3>
        </div>
        <p className="text-body-md mt-2">{insight.observation}</p>
        <div className="mt-3">
          <p className="text-label-sm font-semibold">Supporting evidence</p>
          <ul className="mt-1 flex flex-col gap-1">
            {insight.evidence.map((item) => (
              <li key={item} className="text-body-sm flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="bg-information mt-[0.45rem] size-1.5 shrink-0 rounded-full"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
        {insight.connection ? (
          <p className="text-body-sm text-text-secondary mt-2">
            <span className="text-foreground font-semibold">What this suggests: </span>
            {insight.connection}
          </p>
        ) : null}
        {insight.limitation ? (
          <p className="text-body-sm text-text-secondary mt-2">
            <span className="text-foreground font-semibold">Limitation: </span>
            {insight.limitation}
          </p>
        ) : null}
        {insight.reviewQuestion ? (
          <p className="text-body-sm text-text-secondary mt-2">
            <span className="text-foreground font-semibold">Worth discussing: </span>
            {insight.reviewQuestion}
          </p>
        ) : null}
        <p className="text-muted-foreground mt-3 text-xs">
          Based on {basis}. AI can be wrong. Use the chart and exact values as the evidence.
        </p>
        {qualitative ? (
          <p className="text-muted-foreground mt-2 text-xs">
            Based on anonymous aggregate counts, redacted term counts, per-prompt structure, and a
            fixed word-list tone distribution. It does not read or display individual student
            responses and may miss context, sarcasm, and uncommon feedback.
          </p>
        ) : null}
        {qualitative && state?.ok && state.data.evidence.qualitativeTruncated ? (
          <p className="text-muted-foreground mt-2 text-xs">
            The interpretation used a bounded slice of the written-feedback evidence, not the entire
            corpus.
          </p>
        ) : null}
        {!qualitative && state?.ok && state.data.evidence.truncatedEvidence ? (
          <p className="text-muted-foreground mt-2 text-xs">
            A scope this wide exceeds one AI evidence packet, so the interpretation used the
            highest-volume groups only. The charts above carry the complete figures.
          </p>
        ) : null}
      </div>
    );
  const failure = state && !state.ok ? state.state : null;
  let label: string;
  if (failure === "disabled") {
    label = "AI overview is not enabled for this deployment.";
  } else if (failure && failure !== "insufficient-evidence") {
    label =
      "The AI overview is temporarily unavailable. The verified analytics above are unaffected.";
  } else if (state || data.kpi.submittedResponseCount === 0) {
    label = "There is not enough combined evidence in this scope for a responsible AI overview.";
  } else {
    label = "The AI overview is loading with this scope's evidence.";
  }
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
                    <Badge variant={responseStatusVariant(item.status as DeploymentStatus)}>
                      {formatResponseStatus(item.status as DeploymentStatus)}
                    </Badge>
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
              <p className="shrink-0 text-right tabular-nums">
                <span className="text-title-md block">{group.mean?.toFixed(2) ?? "—"}</span>
                <span className="text-caption text-text-muted block">
                  {group.ratingCount} {group.ratingCount === 1 ? "rating" : "ratings"}
                </span>
              </p>
            </div>
            <dl className="mt-3 text-sm">
              <dt className="text-caption text-text-muted">Bound question</dt>
              <dd className="mt-0.5 break-words">{metric.questionPrompt}</dd>
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
              <TableCell>
                {point.comparableWithPrevious ? "Yes" : (point.breakReason ?? "—")}
              </TableCell>
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
              <TableHead>Instrument</TableHead>
              <TableHead className="text-right">Written answers</TableHead>
              <TableHead className="text-right">Responses</TableHead>
              <TableHead className="text-right whitespace-nowrap">Tone (pos / neu / neg)</TableHead>
              <TableHead>Top terms</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.qualitative.promptCounts.map((row) => (
              <TableRow key={`${row.instrumentId}:${row.prompt}`}>
                <TableCell className="whitespace-normal">{row.prompt}</TableCell>
                <TableCell className="whitespace-normal">{row.instrumentLabel}</TableCell>
                <TableCell className="text-right tabular-nums">{row.itemCount}</TableCell>
                <TableCell className="text-right tabular-nums">{row.responseCount}</TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">
                  {row.tone.positive} / {row.tone.neutral} / {row.tone.negative}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <QualitativeTermChips terms={row.terms} label={`Top terms for ${row.prompt}`} />
                </TableCell>
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
