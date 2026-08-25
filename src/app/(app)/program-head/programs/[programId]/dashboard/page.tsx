import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { notFound } from "next/navigation";
import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getProgramHeadDashboard } from "@/features/analytics/services/get-program-head-dashboard";
import { parseAnalyticsSearchParams } from "@/features/analytics/services/program-head-analytics-state";
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
    <div className="flex min-w-0 flex-col gap-6">
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <header className="border-border flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-label-sm text-primary font-semibold tracking-wider uppercase">
            Evaluation cycle
          </p>
          <h1 className="text-heading-lg mt-1 text-balance">{dashboard.programCode} dashboard</h1>
          <p className="text-body-md text-text-secondary mt-2 max-w-3xl text-pretty">
            <span className="text-foreground font-semibold">{dashboard.programLabel}</span>
            {dashboard.periodLabel ? <span> · {dashboard.periodLabel}</span> : null}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            href={dashboard.links.responses}
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            View Responses
          </Link>
          <Link
            href={dashboard.links.analyticsOutcomes}
            className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-auto")}
          >
            <BarChart3 data-icon="inline-start" aria-hidden="true" />
            Open Analytics
          </Link>
        </div>
      </header>

      <ProgramHeadDashboardKpiGrid
        participation={dashboard.participation}
        pendingResponses={dashboard.pendingResponses}
        activeEvaluations={dashboard.activeEvaluations}
        sourceMeans={dashboard.sourceMeans}
        responsesActiveCourseHref={dashboard.links.responsesActiveCourse}
        responsesActiveProgramWideHref={dashboard.links.responsesActiveProgramWide}
        responsesHref={dashboard.links.responses}
      />

      <ProgramHeadStakeholderProgress
        participation={dashboard.participation}
        stakeholdersHref={dashboard.links.analyticsStakeholders}
      />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)]">
        <ProgramHeadPloSummary
          sources={dashboard.ploSources}
          ploCatalog={dashboard.ploCatalog}
          programId={programId}
          periodFilters={periodFilters}
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
