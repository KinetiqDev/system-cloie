import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ProgramHeadAnalyticsPeriodOptions,
  ProgramHeadAnalyticsScopeSummary,
} from "@/features/analytics/program-head-analytics-types";
import { ProgramHeadAnalyticsFilters } from "./program-head-analytics-filters";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
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
      <header className="border-border flex flex-col gap-2 border-b pb-5">
        <div className="text-primary flex items-center gap-2">
          <BarChart3 aria-hidden="true" />
          <p className="text-label-sm font-semibold tracking-wider uppercase">Program evidence</p>
        </div>
        <h1 className="text-heading-lg text-balance">Analytics</h1>
        <p className="text-body-md text-text-secondary max-w-3xl text-pretty">
          <span className="text-foreground font-semibold">
            {scope.programCode} — {scope.programName}
          </span>
          {scope.periodLabel ? <span> · {scope.periodLabel}</span> : null}
        </p>
      </header>

      <nav
        aria-label="Analytics views"
        className="border-border -mx-1 flex min-w-0 gap-1 overflow-x-auto border-b px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ANALYTICS_TABS.map((tab) => {
          const isActive = tab === filters.tab;
          return (
            <a
              key={tab}
              href={buildAnalyticsTabUrl(programId, tab, filters)}
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
            </a>
          );
        })}
      </nav>

      <ProgramHeadAnalyticsFilters
        programId={programId}
        filters={filters}
        options={periodOptions}
      />

      <section aria-label={`${ANALYTICS_TAB_LABELS[filters.tab]} evidence`} className="min-w-0">
        {children}
      </section>
    </div>
  );
}
