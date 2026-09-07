import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { notFound } from "next/navigation";
import { ArrowRight, BarChart3, ClipboardCheck, Layers3, ListChecks } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { getProgramHeadDashboard } from "@/features/analytics/services/get-program-head-dashboard";
import { parseAnalyticsSearchParams } from "@/features/analytics/services/program-head-analytics-state";
import {
  buildProgramHeadCourseAssignmentsPath,
  buildProgramHeadOutcomesPath,
} from "@/lib/constants/program-head-routes";

export const metadata = {
  title: "Dashboard | Program Head | System CLOIE",
};
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
  const workflows = [
    {
      label: "Review responses",
      detail: "Read submitted stakeholder evidence.",
      href: dashboard.links.responses,
      icon: ClipboardCheck,
    },
    {
      label: "Explore analytics",
      detail: "Compare outcomes, stakeholders, and feedback.",
      href: dashboard.links.analyticsOutcomes,
      icon: BarChart3,
    },
    {
      label: "Manage course assignments",
      detail: "Assign faculty to course offerings.",
      href: buildProgramHeadCourseAssignmentsPath(programId),
      icon: ListChecks,
    },
    {
      label: "Manage learning outcomes",
      detail: "Maintain the program PLO catalog.",
      href: buildProgramHeadOutcomesPath(programId),
      icon: Layers3,
    },
  ];
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <header className="border-border flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-heading-lg text-balance">{dashboard.programCode} dashboard</h1>
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

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <ProgramHeadPloSummary
            sources={dashboard.ploSources}
            ploCatalog={dashboard.ploCatalog}
            programId={programId}
            periodFilters={periodFilters}
          />
          <ProgramHeadQualitativePulse
            pulse={dashboard.qualitative}
            feedbackHref={dashboard.links.analyticsFeedback}
          />
        </div>
        <div className="grid min-w-0 gap-6">
          <ProgramHeadNeedsAttention items={dashboard.needsAttention} />
          <section aria-labelledby="dashboard-workflows-heading" className="min-w-0">
            <Card>
              <CardHeader>
                <h2
                  id="dashboard-workflows-heading"
                  className="font-heading text-base leading-snug font-bold text-balance"
                >
                  Program workflows
                </h2>
                <CardDescription>Review evidence or continue program setup.</CardDescription>
              </CardHeader>
              <CardContent>
                <nav aria-label="Program workflows">
                  <ul className="flex flex-col">
                    {workflows.map(({ label, detail, href, icon: Icon }) => (
                      <li key={href} className="border-border/60 border-b last:border-b-0">
                        <Link
                          href={href}
                          aria-label={label}
                          className="focus-visible:ring-ring hover:bg-surface-hover group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none pointer-coarse:min-h-12"
                        >
                          <span className="bg-primary-soft text-selected-fg flex size-9 shrink-0 items-center justify-center rounded-lg">
                            <Icon aria-hidden="true" className="size-4" />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="text-title-sm text-text-primary text-pretty">
                              {label}
                            </span>
                            <span className="text-caption text-muted-foreground text-pretty">
                              {detail}
                            </span>
                          </span>
                          <ArrowRight
                            aria-hidden="true"
                            className="text-text-secondary size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
