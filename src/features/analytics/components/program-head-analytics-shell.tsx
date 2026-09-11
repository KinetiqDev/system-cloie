import type { ReactNode } from "react";
import type {
  ProgramHeadAnalyticsPeriodOptions,
  ProgramHeadAnalyticsScopeSummary,
} from "@/features/analytics/program-head-analytics-types";
import { ProgramHeadAnalyticsFilters } from "./program-head-analytics-filters";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ViewTabs } from "@/components/ui/view-tabs";
import { ProgramHeadAnalyticsWorkspace } from "./program-head-analytics-workspace";
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
        <div className="flex flex-col gap-1">
          <h1 className="text-heading-lg text-foreground tracking-tight text-balance">Analytics</h1>
          <p className="text-body-md text-text-secondary max-w-3xl text-pretty">
            <span className="text-foreground font-semibold">
              {scope.programCode} — {scope.programName}
            </span>
            {scope.periodLabel ? <span> · {scope.periodLabel}</span> : null}
          </p>
        </div>
      </header>

      <ViewTabs
        label="Analytics views"
        activeValue={filters.tab}
        items={ANALYTICS_TABS.map((tab) => ({
          value: tab,
          label: ANALYTICS_TAB_LABELS[tab],
          href: buildAnalyticsTabUrl(programId, tab, filters),
        }))}
      />
      <ProgramHeadAnalyticsWorkspace
        tab={filters.tab}
        filters={
          <ProgramHeadAnalyticsFilters
            programId={programId}
            filters={filters}
            options={periodOptions}
          />
        }
      >
        {children}
      </ProgramHeadAnalyticsWorkspace>
    </div>
  );
}
