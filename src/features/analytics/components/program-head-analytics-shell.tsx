import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  ProgramHeadAnalyticsPeriodOptions,
  ProgramHeadAnalyticsScopeSummary,
} from "@/features/analytics/program-head-analytics-types";
import { ProgramHeadAnalyticsFilters } from "./program-head-analytics-filters";
import type { AnalyticsFilterState, AnalyticsTab } from "@/features/analytics/services/program-head-analytics-state";
import {
  ANALYTICS_TABS,
  ANALYTICS_TAB_LABELS,
  buildAnalyticsTabUrl,
} from "@/features/analytics/services/program-head-analytics-state";

type ProgramHeadAnalyticsShellProps = {
  programId: string;
  filters: AnalyticsFilterState;
  scope: ProgramHeadAnalyticsScopeSummary;
  periodOptions: ProgramHeadAnalyticsPeriodOptions;
  children: ReactNode;
};

export function ProgramHeadAnalyticsShell({
  programId,
  filters,
  scope,
  periodOptions,
  children,
}: ProgramHeadAnalyticsShellProps) {
  const hasLiveView =
    filters.tab === "overview" || filters.tab === "outcomes" || filters.tab === "trends";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-lg">Analytics</h1>
        <p className="text-body-md text-text-secondary">
          <span className="text-link font-semibold">
            {scope.programCode} — {scope.programName}
          </span>
          {scope.periodLabel ? <span> · {scope.periodLabel}</span> : null}
        </p>
      </div>

      <ProgramHeadAnalyticsFilters programId={programId} filters={filters} options={periodOptions} />

      <div className="flex flex-col gap-4">
        <nav
          aria-label="Analytics views"
          className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {ANALYTICS_TABS.map((tab) => {
            const isActive = tab === filters.tab;
            return (
              <a
                key={tab}
                href={buildAnalyticsTabUrl(programId, tab, filters)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "text-label-md rounded-lg px-3 py-1.5 whitespace-nowrap transition-colors",
                  "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  "pointer-coarse:min-h-11 pointer-coarse:px-4 pointer-coarse:py-2.5",
                  isActive
                    ? "bg-primary-soft text-selected-fg"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {ANALYTICS_TAB_LABELS[tab]}
              </a>
            );
          })}
        </nav>

        {hasLiveView ? children : <UpcomingTabNotice tab={filters.tab} />}
      </div>
    </div>
  );
}

function UpcomingTabNotice({ tab }: { tab: AnalyticsTab }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-body-md text-muted-foreground">
          The {ANALYTICS_TAB_LABELS[tab]} view is not available yet. Overview analytics are live;
          the remaining views arrive in upcoming releases.
        </p>
      </CardContent>
    </Card>
  );
}
