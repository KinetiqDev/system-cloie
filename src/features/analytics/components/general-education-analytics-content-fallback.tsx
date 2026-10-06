import { SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteProgress } from "@/components/ui/route-progress";
import { tabsListVariants, tabsTriggerClass } from "@/components/ui/tabs-styles";
import { cn } from "@/lib/utils";
import {
  GENERAL_EDUCATION_ANALYTICS_TABS,
  GENERAL_EDUCATION_ANALYTICS_TAB_LABELS,
  type GeneralEducationAnalyticsTab,
} from "@/features/analytics/services/general-education-analytics-state";

function AlertSkeleton() {
  return (
    <div
      data-testid="ge-analytics-alert-skeleton"
      className="border-border flex flex-col gap-2 rounded-lg border p-3"
    >
      <Skeleton className="h-4 w-56 max-w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

export function AnalyticsChartSkeleton() {
  return (
    <Card data-testid="analytics-chart-skeleton">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-64 max-w-2/3" />
          <Skeleton className="h-3 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-72 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <div data-testid="ge-analytics-table-skeleton" className="flex flex-col gap-3">
      <Skeleton className="h-5 w-64 max-w-3/4" />
      <div className="border-border flex flex-col gap-4 overflow-x-auto rounded-lg border p-4">
        {["header", "first", "second"].map((row) => (
          <div key={row} className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Tab-shaped loading geometry: each view keeps the structure it will replace. */
function EvidenceSkeleton({ tab }: { tab: GeneralEducationAnalyticsTab }) {
  const chartCount = tab === "outcomes" ? 3 : tab === "courses" ? 3 : tab === "programs" ? 2 : 1;
  const showsAlert = tab === "outcomes" || tab === "qualitative";
  const showsTable = tab !== "qualitative";

  return (
    <>
      {showsAlert ? <AlertSkeleton /> : null}
      {Array.from({ length: chartCount }, (_, index) => (
        <AnalyticsChartSkeleton key={index} />
      ))}
      {showsTable ? <TableSkeleton /> : null}
    </>
  );
}

export function GeneralEducationAnalyticsContentFallback({
  tab,
}: {
  tab: GeneralEducationAnalyticsTab;
}) {
  const label = `Loading ${GENERAL_EDUCATION_ANALYTICS_TAB_LABELS[tab]} evidence`;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className="flex flex-col gap-6"
    >
      <EvidenceSkeleton tab={tab} />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function GeneralEducationAnalyticsRouteFallback() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading analytics"
      className="flex min-w-0 flex-col gap-6"
    >
      <RouteProgress />
      <header className="border-border/80 flex flex-col gap-3 border-b pb-5">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-11 w-56" />
      </header>
      <nav aria-label="Loading analytics views" className={tabsListVariants({ variant: "line" })}>
        {GENERAL_EDUCATION_ANALYTICS_TABS.map((tab) => (
          <span
            key={tab}
            className={cn(tabsTriggerClass, "pointer-events-none")}
            aria-hidden="true"
          >
            <Skeleton className="h-5 w-20" />
          </span>
        ))}
      </nav>
      <Card data-testid="ge-analytics-filter-skeleton">
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-3 w-full max-w-xl" />
        </CardHeader>
        <CardContent>
          <div className="hidden grid-cols-12 items-end gap-4 lg:grid">
            {["first", "second", "third", "fourth", "fifth", "sixth", "seventh"].map((slot) => (
              <Skeleton key={slot} className="h-14 lg:col-span-2" />
            ))}
            <Skeleton className="h-10 lg:col-span-2" />
          </div>
          <Skeleton className="h-11 w-full lg:hidden" />
        </CardContent>
      </Card>
      <EvidenceSkeleton tab="outcomes" />
    </div>
  );
}
