import { BarChart3, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ANALYTICS_TABS,
  ANALYTICS_TAB_LABELS,
  type AnalyticsFilterState,
} from "@/features/analytics/services/program-head-analytics-state";

function AlertSkeleton() {
  return (
    <div
      data-testid="analytics-alert-skeleton"
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
    <div data-testid="analytics-table-skeleton" className="flex flex-col gap-3">
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

function EvidenceSkeleton({ tab }: { tab: AnalyticsFilterState["tab"] }) {
  const chartCount = tab === "stakeholders" ? 2 : tab === "courses" ? 3 : 1;
  const showsAlert = tab === "outcomes" || tab === "stakeholders";
  const showsTable = tab === "outcomes" || tab === "trends" || tab === "qualitative";

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

export function ProgramHeadAnalyticsContentFallback({ tab }: { tab: AnalyticsFilterState["tab"] }) {
  const label = `Loading ${ANALYTICS_TAB_LABELS[tab]} evidence`;
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

export function ProgramHeadAnalyticsRouteFallback() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading analytics"
      className="flex min-w-0 flex-col gap-6"
    >
      <Skeleton className="h-4 w-40" />
      <header className="border-border/80 flex flex-col gap-3 border-b pb-5">
        <div className="flex items-center gap-2">
          <div className="bg-primary-soft text-selected-fg flex size-7 items-center justify-center rounded-lg">
            <BarChart3 aria-hidden="true" className="size-4" />
          </div>
          <Skeleton className="h-3 w-52" />
        </div>
        <Skeleton className="h-7 w-40" />
        <div className="flex max-w-2xl flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2 sm:hidden" />
        </div>
      </header>
      <nav
        aria-label="Loading analytics views"
        className="border-border/80 flex gap-5 overflow-x-auto border-b pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ANALYTICS_TABS.map((tab) => (
          <Skeleton key={tab} className="h-4 w-20 shrink-0" />
        ))}
      </nav>
      <Card data-testid="analytics-filter-skeleton">
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-3 w-full max-w-xl" />
        </CardHeader>
        <CardContent>
          <div className="hidden grid-cols-12 items-end gap-4 lg:grid">
            <Skeleton className="h-14 lg:col-span-4" />
            <Skeleton className="h-14 lg:col-span-3" />
            <Skeleton className="h-14 lg:col-span-3" />
            <Skeleton className="h-10 lg:col-span-2" />
          </div>
          <Skeleton className="h-11 w-full lg:hidden" />
        </CardContent>
      </Card>
      <EvidenceSkeleton tab="outcomes" />
    </div>
  );
}
