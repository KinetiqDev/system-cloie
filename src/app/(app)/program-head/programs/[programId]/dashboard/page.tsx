import { notFound } from "next/navigation";
import { BarChart3, ClipboardList, MessagesSquare, Target } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProgramHeadDashboard } from "@/features/analytics/services/get-program-head-dashboard";
import { parseAnalyticsSearchParams } from "@/features/analytics/services/program-head-analytics-state";
import { buildProgramHeadCourseAssignmentsPath, buildProgramHeadOutcomesPath } from "@/lib/constants/program-head-routes";
import { ProgramHeadDashboardKpiGrid } from "@/features/analytics/components/program-head-dashboard-kpis";
import { ProgramHeadStakeholderProgress } from "@/features/analytics/components/program-head-stakeholder-progress";
import { ProgramHeadPloSummary } from "@/features/analytics/components/program-head-plo-summary";
import { ProgramHeadNeedsAttention } from "@/features/analytics/components/program-head-needs-attention";
import { ProgramHeadQualitativePulse } from "@/features/analytics/components/program-head-qualitative-pulse";
import { cn } from "@/lib/utils";

export default async function SelectedProgramDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ programId }, rawSearchParams] = await Promise.all([params, searchParams]);
  // Period filters share the Analytics URL contract; missing filters default
  // to the active academic period inside the service (spec §13.1).
  const analyticsFilters = parseAnalyticsSearchParams(rawSearchParams);
  const periodFilters = {
    schoolYearId: analyticsFilters.schoolYearId,
    semester: analyticsFilters.semester,
    termInstanceId: analyticsFilters.termInstanceId,
  };
  const dashboard = await getProgramHeadDashboard(programId, periodFilters);
  if (!dashboard) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-heading-lg">Dashboard</h1>
          <p className="text-body-md text-text-secondary">
            <span className="text-link font-semibold">
              {dashboard.programCode} — {dashboard.programLabel}
            </span>
            {dashboard.periodLabel ? <span> · {dashboard.periodLabel}</span> : null}
            · Operational summary of this evaluation cycle
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={dashboard.links.responses}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            View Responses
          </Link>
          <Link
            href={dashboard.links.analyticsOutcomes}
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            <BarChart3 aria-hidden="true" className="size-4" />
            Open Analytics
          </Link>
        </div>
      </div>

      <ProgramHeadDashboardKpiGrid
        participation={dashboard.participation}
        pendingResponses={dashboard.pendingResponses}
        activeEvaluations={dashboard.activeEvaluations}
        sourceMeans={dashboard.sourceMeans}
        responsesActiveCourseHref={dashboard.links.responsesActiveCourse}
        responsesActiveProgramWideHref={dashboard.links.responsesActiveProgramWide}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ProgramHeadStakeholderProgress
          participation={dashboard.participation}
          stakeholdersHref={dashboard.links.analyticsStakeholders}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Quick actions</CardTitle>
            <CardDescription>Common Program Head workflows.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <QuickAction
              href={dashboard.links.responses}
              icon={<MessagesSquare aria-hidden="true" className="size-4" />}
              title="View Responses"
              description="Inspect evaluations and submitted answers"
            />
            <QuickAction
              href={dashboard.links.analyticsOutcomes}
              icon={<BarChart3 aria-hidden="true" className="size-4" />}
              title="Explore Analytics"
              description="Trace PLO, course and stakeholder evidence"
            />
            <QuickAction
              href={buildProgramHeadCourseAssignmentsPath(programId)}
              icon={<ClipboardList aria-hidden="true" className="size-4" />}
              title="Course Assignments"
              description="Manage classes, faculty and sections"
            />
            <QuickAction
              href={buildProgramHeadOutcomesPath(programId)}
              icon={<Target aria-hidden="true" className="size-4" />}
              title="Manage Learning Outcomes"
              description="Manage PLOs and outcome mappings"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ProgramHeadPloSummary
          sources={dashboard.ploSources}
          ploCatalog={dashboard.ploCatalog}
          outcomesHref={dashboard.links.analyticsOutcomes}
        />
        <ProgramHeadNeedsAttention items={dashboard.needsAttention} />
      </div>

      <ProgramHeadQualitativePulse
        pulse={dashboard.qualitative}
        feedbackHref={dashboard.links.analyticsFeedback}
      />
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="focus-visible:ring-ring hover:border-primary/40 flex items-start gap-3 rounded-lg border px-3 py-2.5 pointer-coarse:min-h-11 transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <span>
        <span className="text-label-md block font-bold">{title}</span>
        <span className="text-muted-foreground block text-label-sm">{description}</span>
      </span>
    </Link>
  );
}
