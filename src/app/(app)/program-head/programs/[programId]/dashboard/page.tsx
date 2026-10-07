import { notFound } from "next/navigation";
import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProgramHeadDashboard } from "@/features/analytics/services/get-program-head-dashboard";
import { parseAnalyticsSearchParams } from "@/features/analytics/services/program-head-analytics-state";
import { ProgramHeadDashboardKpis } from "@/features/analytics/components/program-head-dashboard-kpis";
import { ProgramHeadStakeholderProgress } from "@/features/analytics/components/program-head-stakeholder-progress";
import { ProgramHeadGoSummary } from "@/features/analytics/components/program-head-po-summary";
import { ProgramHeadNeedsAttention } from "@/features/analytics/components/program-head-needs-attention";
import { ProgramHeadQualitativePulse } from "@/features/analytics/components/program-head-qualitative-pulse";
import { buildPageTitle } from "@/lib/page-title";
import { cn } from "@/lib/utils";

export const metadata = {
  title: buildPageTitle("Dashboard", "Program Head"),
};

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
  const hasExplicitPeriodFilter = Boolean(
    periodFilters.schoolYearId || periodFilters.semester || periodFilters.termInstanceId
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-heading-xl text-balance">Dashboard</h1>
          <div className="text-body-sm text-text-secondary flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
            <Badge
              variant="secondary"
              className="text-body-sm h-auto max-w-full px-2.5 py-0.5 text-pretty whitespace-normal"
            >
              {dashboard.programLabel}
            </Badge>
            <span>
              <span className="sr-only">
                {hasExplicitPeriodFilter ? "Selected Academic Period" : "Active Academic Period"}
                :{" "}
              </span>
              {dashboard.periodLabel ?? "No active Academic Period"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link
            href={dashboard.links.responses}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            View Responses
          </Link>
          <Link href={dashboard.links.analyticsOutcomes} className={buttonVariants()}>
            <BarChart3 data-icon="inline-start" aria-hidden="true" />
            Open Analytics
          </Link>
        </div>
      </header>

      <ProgramHeadDashboardKpis
        participation={dashboard.participation}
        activeEvaluations={dashboard.activeEvaluations}
        stakeholdersHref={dashboard.links.analyticsStakeholders}
        activeEvaluationsHref={dashboard.links.responsesActiveCourse}
      />

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(19rem,1fr)]">
        <div className="flex min-w-0 flex-col gap-6 lg:order-2">
          <ProgramHeadNeedsAttention items={dashboard.needsAttention} />
          <ProgramHeadStakeholderProgress
            participation={dashboard.participation}
            stakeholdersHref={dashboard.links.analyticsStakeholders}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:order-1">
          <ProgramHeadGoSummary
            sources={dashboard.poSources}
            poCatalog={dashboard.poCatalog}
            programId={programId}
            periodFilters={periodFilters}
          />
          <ProgramHeadQualitativePulse
            pulse={dashboard.qualitative}
            feedbackHref={dashboard.links.analyticsFeedback}
          />
        </div>
      </div>
    </div>
  );
}
