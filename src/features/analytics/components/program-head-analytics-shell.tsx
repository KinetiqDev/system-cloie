import { Suspense, type ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ProgramHeadAnalyticsPeriodOptions,
  ProgramHeadAnalyticsScopeSummary,
} from "@/features/analytics/program-head-analytics-types";
import { ProgramHeadAnalyticsFilters } from "./program-head-analytics-filters";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { NavigationLink } from "@/components/layout/navigation-link";
import { ProgramHeadAnalyticsContentFallback } from "./program-head-analytics-content-fallback";
import type { AnalyticsFilterState } from "@/features/analytics/services/program-head-analytics-state";
import {
  ANALYTICS_TABS,
  ANALYTICS_TAB_LABELS,
  buildAnalyticsTabUrl,
  buildAnalyticsUrl,
} from "@/features/analytics/services/program-head-analytics-state";

type ProgramHeadAnalyticsShellProps = {
  programId: string;
  filters: AnalyticsFilterState;
  scope: ProgramHeadAnalyticsScopeSummary;
  periodOptions: ProgramHeadAnalyticsPeriodOptions;
  children: ReactNode;
  ploCode?: string;
};

export function ProgramHeadAnalyticsShell({
  programId,
  filters,
  scope,
  periodOptions,
  children,
  ploCode,
}: ProgramHeadAnalyticsShellProps) {
  const breadcrumbItems = [
    {
      label: "Analytics",
      href: buildAnalyticsUrl(programId, {
        schoolYearId: filters.schoolYearId,
        semester: filters.semester,
        termInstanceId: filters.termInstanceId,
        evidenceSource: filters.evidenceSource,
        stakeholder: filters.stakeholder,
      }),
    },
    ...(ploCode
      ? [
          {
            label: ANALYTICS_TAB_LABELS[filters.tab],
            href: buildAnalyticsUrl(programId, { ...filters, ploId: undefined }),
          },
        ]
      : []),
    { label: ploCode ?? ANALYTICS_TAB_LABELS[filters.tab] },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Breadcrumbs items={breadcrumbItems} />
      <header className="border-border/80 flex flex-col gap-3 border-b pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <BarChart3 aria-hidden="true" className="size-4" />
            </div>
            <span className="text-label-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Program Evidence & Analytics
            </span>
          </div>
          {scope.periodLabel ? (
            <span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground border border-border/60">
              {scope.periodLabel}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-heading-lg text-foreground tracking-tight text-balance">
            {scope.programCode} — {scope.programName}
          </h1>
          <p className="text-body-sm text-muted-foreground max-w-3xl text-pretty">
            Outcome-Based Education attainment metrics, course evidence, stakeholder evaluations, and continuous quality improvement data.
          </p>
        </div>
      </header>

      <div className="relative">
        <nav
          aria-label="Analytics views"
          className="border-border/80 -mx-1 flex min-w-0 gap-1 overflow-x-auto border-b px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
        {ANALYTICS_TABS.map((tab) => {
          const isActive = tab === filters.tab;
          return (
            <NavigationLink
              key={tab}
              href={buildAnalyticsTabUrl(programId, tab, filters)}
              prefetch={false}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "text-label-md relative inline-flex min-h-11 shrink-0 items-center px-3 font-semibold whitespace-nowrap transition-colors motion-reduce:transition-none",
                "focus-visible:ring-ring focus-visible:rounded-t-lg focus-visible:ring-2 focus-visible:outline-none",
                "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors motion-reduce:after:transition-none",
                isActive
                  ? "text-primary after:bg-primary"
                  : "text-muted-foreground hover:text-foreground hover:after:bg-border-strong after:bg-transparent"
              )}
            >
              {ANALYTICS_TAB_LABELS[tab]}
            </NavigationLink>
          );
        })}
        </nav>
      </div>
      <ProgramHeadAnalyticsFilters
        programId={programId}
        filters={filters}
        options={periodOptions}
      />

      <section aria-label={`${ANALYTICS_TAB_LABELS[filters.tab]} evidence`} className="min-w-0">
        <Suspense fallback={<ProgramHeadAnalyticsContentFallback />}>{children}</Suspense>
      </section>
    </div>
  );
}
