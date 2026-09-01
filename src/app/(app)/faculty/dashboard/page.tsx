import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ListChecks,
  UsersRound,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  getFacultyDashboard,
  type FacultyCourseOverviewItem,
  type FacultyDashboardKPI,
  type FacultyDashboardVisualizations as FacultyDashboardVisualizationsData,
  type FacultyUpcomingEvaluation,
} from "@/features/analytics/services/get-faculty-dashboard";
import { FacultyDashboardVisualizations } from "@/features/analytics/components/faculty-dashboard-visualizations";
import {
  CourseMeanPieChartFallback,
  QualitativeWordCloudFallback,
} from "@/features/analytics/components/faculty-dashboard-visualization-fallbacks";
import { HowCalculatedPopover } from "@/features/analytics/components/how-calculated-popover";
import { ROLES } from "@/lib/constants/roles";
import { formatDate } from "@/lib/utils/date-format";

export default async function FacultyDashboardPage() {
  const session = await resolveAuthSession();
  if (!session) redirect("/portal/respondents");
  if (session.activeRole !== ROLES.FACULTY) redirect("/unauthorized");

  const dashboard = await getFacultyDashboard(session.userId);
  if (!dashboard) redirect("/unauthorized");
  const visualizationsPromise = Promise.resolve<FacultyDashboardVisualizationsData>({
    courseEvidence: dashboard.courseEvidence,
    wordCloudTokens: dashboard.wordCloudTokens,
    qualitativeItemCount: dashboard.qualitativeItemCount,
    qualitativeResponseCount: dashboard.qualitativeResponseCount,
    qualitativeEvaluationCount: dashboard.qualitativeEvaluationCount,
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-heading-lg">Faculty dashboard</h1>
          <p className="text-body-md text-text-secondary break-words">
            <span className="text-foreground font-semibold">
              {dashboard.programCode} · {dashboard.programLabel}
            </span>
            {dashboard.periodLabel ? ` · ${dashboard.periodLabel}` : " · No active academic period"}
          </p>
          <p className="text-muted-foreground text-body-sm max-w-3xl">
            Current evaluation progress, course evidence, and the next work that needs your
            attention.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/faculty/analytics" />}>
          Open Faculty analytics <ArrowRight data-icon="inline-end" />
        </Button>
      </header>

      <AttentionStrip kpi={dashboard.kpi} courseOverview={dashboard.courseOverview} />
      <FacultyKpiGrid kpi={dashboard.kpi} />

      <section
        aria-labelledby="work-overview-title"
        className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]"
      >
        <div className="min-w-0 space-y-3 xl:order-1">
          <div>
            <h2 id="work-overview-title" className="text-heading-md">
              Current evaluation work
            </h2>
            <p className="text-muted-foreground text-body-sm mt-1">
              Actions and deadlines for the active academic period.
            </p>
          </div>
          <CourseOverview items={dashboard.courseOverview} />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:order-2 xl:grid-cols-1 xl:self-start">
          <QuickActions />
          <UpcomingDeadlines items={dashboard.upcomingEvaluations} />
        </div>
      </section>

      <section aria-labelledby="evidence-title" className="space-y-3">
        <div>
          <h2 id="evidence-title" className="text-heading-md">
            Response evidence
          </h2>
          <p className="text-muted-foreground text-body-sm mt-1">
            Submitted responses only. Rating scales remain separate when they are not compatible.
          </p>
        </div>
        <Suspense fallback={<VisualizationFallbacks />}>
          <FacultyDashboardVisualizationsSection visualizationsPromise={visualizationsPromise} />
        </Suspense>
      </section>
    </div>
  );
}

function AttentionStrip({
  kpi,
  courseOverview,
}: {
  kpi: FacultyDashboardKPI;
  courseOverview: FacultyCourseOverviewItem[];
}) {
  const rosterBlockers = courseOverview.filter((item) => item.rosterCount === 0).length;
  const unpublished = courseOverview.filter((item) => item.evaluationId === null).length;
  const hasAttention = kpi.closingWithin7Days > 0 || rosterBlockers > 0 || unpublished > 0;
  if (!hasAttention) {
    return (
      <Alert variant="success">
        <CheckCircle2 aria-hidden="true" />
        <AlertTitle>No blocking setup issues</AlertTitle>
        <AlertDescription>
          Your current course rosters and published evaluations do not need immediate attention.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant={kpi.closingWithin7Days > 0 ? "warning" : "information"}>
      <CalendarClock aria-hidden="true" />
      <AlertTitle>
        {kpi.closingWithin7Days > 0
          ? `${kpi.closingWithin7Days} evaluation${kpi.closingWithin7Days === 1 ? "" : "s"} close within 7 days`
          : "Setup work needs attention"}
      </AlertTitle>
      <AlertDescription>
        {[
          rosterBlockers > 0
            ? `${rosterBlockers} course roster${rosterBlockers === 1 ? " has" : "s have"} no active students`
            : null,
          unpublished > 0
            ? `${unpublished} course${unpublished === 1 ? " has" : "s have"} no published evaluation`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </AlertDescription>
    </Alert>
  );
}

function FacultyKpiGrid({ kpi }: { kpi: FacultyDashboardKPI }) {
  const completion = kpi.completionRate === null ? null : Math.round(kpi.completionRate * 100);
  const meanEvidence = {
    assignmentCount: kpi.evaluationOpportunities,
    ratingCount: kpi.overallRatingCount,
    responseCount: kpi.totalResponses,
    scaleLabel: kpi.overallScaleLabel ?? undefined,
    explanation:
      "The mean pools submitted quantitative rating items in the active academic period. Incompatible rating scales are never combined. Response progress uses every evaluation assignment created in this period as its denominator.",
    evidenceHref: "/faculty/analytics",
  };
  return (
    <section
      aria-label="Faculty dashboard metrics"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <MetricCard
        label="Current evaluations"
        value={kpi.activeEvaluations.toLocaleString()}
        icon={<ClipboardList aria-hidden="true" />}
        href="/faculty/tools?tab=published"
      >
        {kpi.scheduledEvaluations.toLocaleString()} scheduled ·{" "}
        {kpi.closingWithin7Days.toLocaleString()} close within 7 days
      </MetricCard>
      <MetricCard
        label="Response progress"
        value={completion === null ? "—" : `${completion}%`}
        icon={<ListChecks aria-hidden="true" />}
        href="/faculty/tools?tab=published"
      >
        {kpi.evaluationOpportunities === 0
          ? "No evaluation assignments in this period."
          : `${kpi.totalResponses.toLocaleString()} of ${kpi.evaluationOpportunities.toLocaleString()} evaluation assignments submitted`}
        {completion !== null ? (
          <Progress
            value={completion}
            aria-label={`${completion}% response completion`}
            className="mt-2"
          />
        ) : null}
      </MetricCard>
      <MetricCard
        label="Awaiting responses"
        value={kpi.pendingResponses.toLocaleString()}
        icon={<Clock3 aria-hidden="true" />}
        href="/faculty/tools?tab=published"
      >
        Eligible active evaluation assignments that are not yet submitted
      </MetricCard>
      <MetricCard
        label="Overall rating"
        value={
          kpi.spansMultipleScales
            ? "Multiple scales"
            : kpi.overallMean === null
              ? "—"
              : `${kpi.overallMean.toFixed(2)}${kpi.overallScaleMax === null ? "" : ` / ${kpi.overallScaleMax}`}`
        }
        icon={<BarChart3 aria-hidden="true" />}
        href="/faculty/analytics"
        action={<HowCalculatedPopover metric={meanEvidence} label="Overall rating" />}
      >
        {kpi.spansMultipleScales
          ? "Open analytics to compare each compatible scale separately."
          : kpi.overallMean === null
            ? "No submitted quantitative ratings in this period."
            : `${kpi.totalResponses.toLocaleString()} responses · ${kpi.overallRatingCount.toLocaleString()} ratings · ${kpi.overallScaleLabel ?? "scale unavailable"}`}
      </MetricCard>
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon,
  href,
  action,
  children,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  href: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardDescription className="text-label-sm font-semibold tracking-wider uppercase">
            {label}
          </CardDescription>
          <div className="text-muted-foreground flex items-center gap-1 [&>svg]:size-4">
            {action}
            {icon}
          </div>
        </div>
        <CardTitle className="text-display-md break-words tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        <div className="text-muted-foreground text-body-sm">{children}</div>
        <Link
          href={href}
          className="text-link text-label-sm inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline"
        >
          View details <ArrowRight aria-hidden="true" className="ml-1 size-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  const actions = [
    { href: "/faculty/course-rosters", label: "Review my course rosters", icon: UsersRound },
    { href: "/faculty/cilo-evaluations/new", label: "Publish an evaluation", icon: ClipboardList },
    { href: "/faculty/cilos", label: "Manage CILOs", icon: BookOpenCheck },
    { href: "/faculty/analytics", label: "Open Faculty analytics", icon: BarChart3 },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
        <CardDescription>Continue common Faculty work</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {actions.map(({ href, label, icon: Icon }, index) => (
          <Button
            key={href}
            variant={index === 0 ? "default" : "outline"}
            className="h-auto min-h-11 justify-between py-2 text-left whitespace-normal"
            render={<Link href={href} />}
          >
            <span className="flex items-center gap-2">
              <Icon aria-hidden="true" />
              {label}
            </span>
            <ArrowRight aria-hidden="true" />
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function UpcomingDeadlines({ items }: { items: FacultyUpcomingEvaluation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming evaluations</CardTitle>
        <CardDescription>The next active or scheduled evaluations</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-body-sm">
            No active or scheduled evaluations in this period.
          </p>
        ) : (
          <div className="divide-border divide-y">
            {items.map((item) => {
              const progress =
                item.assignedCount === 0
                  ? 0
                  : Math.round((item.submittedCount / item.assignedCount) * 100);
              return (
                <Link
                  key={item.evaluationId}
                  href={`/faculty/cilo-evaluations/${item.evaluationId}`}
                  className="hover:bg-surface-hover focus-visible:ring-ring block rounded-lg py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        <span className="tabular-nums">{item.courseCode}</span> ·{" "}
                        <span className="break-words">{item.courseTitle}</span>
                      </p>
                      <p className="text-muted-foreground text-body-sm">
                        {item.deadlineAt
                          ? `Closes ${formatDate(item.deadlineAt)}`
                          : "No deadline set"}
                      </p>
                    </div>
                    <Badge variant={item.status === "ACTIVE" ? "success" : "information"}>
                      {item.status === "ACTIVE" ? "Active" : "Scheduled"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-label-sm mt-2">
                    {item.submittedCount.toLocaleString()} of {item.assignedCount.toLocaleString()}{" "}
                    submitted
                  </p>
                  <Progress
                    value={progress}
                    aria-label={`${item.courseCode}: ${progress}% submitted`}
                    className="mt-2"
                  />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CourseOverview({ items }: { items: FacultyCourseOverviewItem[] }) {
  if (items.length === 0)
    return (
      <Card>
        <CardContent>
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
            <UsersRound aria-hidden="true" className="text-muted-foreground size-8" />
            <div>
              <p className="font-semibold">No active course assignments</p>
              <p className="text-muted-foreground text-body-sm mt-1">
                Your active-period courses will appear here after an assignment is created.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardContent className="px-0">
        <div className="divide-border divide-y">
          {items.map((item) => {
            const href = item.evaluationId
              ? `/faculty/cilo-evaluations/${item.evaluationId}`
              : "/faculty/tools";
            return (
              <Link
                key={item.assignmentId}
                href={href}
                className="hover:bg-surface-hover focus-visible:ring-ring grid gap-3 px-4 py-4 transition-colors focus-visible:ring-2 focus-visible:outline-none md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(7rem,auto))_auto] md:items-center"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    <span className="tabular-nums">{item.courseCode}</span> ·{" "}
                    <span className="break-words">{item.courseTitle}</span>
                  </p>
                  <p className="text-muted-foreground text-body-sm">
                    {item.contextLabel} ·{" "}
                    {item.evaluationStatus
                      ? item.evaluationStatus.toLowerCase().replace("_", " ")
                      : "No published evaluation"}
                    {item.deadlineAt ? ` · closes ${formatDate(item.deadlineAt)}` : ""}
                  </p>
                </div>
                <OverviewDatum label="Roster" value={`${item.rosterCount} students`} />
                <OverviewDatum
                  label="Responses"
                  value={
                    item.evaluationId
                      ? `${item.submittedCount} of ${item.assignedCount}`
                      : "Not available"
                  }
                />
                <OverviewDatum
                  label="Rating"
                  value={
                    item.spansMultipleScales
                      ? "Multiple scales"
                      : item.mean === null
                        ? "No evidence"
                        : `${item.mean.toFixed(2)} · ${item.scaleLabel ?? "scale unavailable"}`
                  }
                />
                <ArrowRight
                  aria-hidden="true"
                  className="text-muted-foreground hidden size-4 md:block"
                />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewDatum({ label, value }: { label: string; value: string }) {
  return (
    <dl className="text-body-sm grid grid-cols-[auto_1fr] gap-x-2 md:block">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums md:mt-0.5">{value}</dd>
    </dl>
  );
}

function VisualizationFallbacks() {
  return (
    <div className="space-y-6">
      <CourseMeanPieChartFallback />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <QualitativeWordCloudFallback />
        <Card className="min-h-[424px]" />
      </div>
    </div>
  );
}

async function FacultyDashboardVisualizationsSection({
  visualizationsPromise,
}: {
  visualizationsPromise: Promise<FacultyDashboardVisualizationsData | null>;
}) {
  const visualizations = await visualizationsPromise.catch(() => undefined);
  if (visualizations === undefined) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Response evidence could not be loaded</AlertTitle>
        <AlertDescription>
          Your evaluation metrics and course work are still available. Refresh the page to try the
          evidence section again.
        </AlertDescription>
      </Alert>
    );
  }
  if (visualizations === null) {
    return (
      <Alert variant="information">
        <AlertTitle>Evidence is unavailable</AlertTitle>
        <AlertDescription>
          Your dashboard metrics remain available. Refresh the page to try loading response evidence
          again.
        </AlertDescription>
      </Alert>
    );
  }
  return <FacultyDashboardVisualizations {...visualizations} />;
}
