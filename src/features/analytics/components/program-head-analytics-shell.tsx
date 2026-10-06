import type { ReactNode } from "react";
import type {
  ProgramHeadAnalyticsPeriodOptions,
  ProgramHeadAnalyticsScopeSummary,
} from "@/features/analytics/program-head-analytics-types";
import { ProgramHeadAnalyticsFilters } from "./program-head-analytics-filters";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ViewTabs } from "@/components/layout/view-tabs";
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
  poCode?: string;
};

export function ProgramHeadAnalyticsShell({
  programId,
  filters,
  scope,
  periodOptions,
  children,
  poCode,
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
    ...(poCode
      ? [
          {
            label: ANALYTICS_TAB_LABELS[filters.tab],
            href: buildAnalyticsUrl(programId, { ...filters, poId: undefined }),
          },
        ]
      : []),
    { label: poCode ?? ANALYTICS_TAB_LABELS[filters.tab] },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="border-border/80 flex flex-col gap-3 border-b pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-heading-xl text-balance">Analytics</h1>
          <Breadcrumbs items={breadcrumbItems} className="text-body-sm" />
          {scope.periodLabel ? (
            <p className="text-body-sm text-text-secondary text-pretty">{scope.periodLabel}</p>
          ) : null}
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
