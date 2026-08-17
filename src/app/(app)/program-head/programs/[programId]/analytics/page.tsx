import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { ProgramHeadAnalyticsShell } from "@/features/analytics/components/program-head-analytics-shell";
import { ProgramHeadOverviewKPIs } from "@/features/analytics/components/program-head-overview-kpis";
import { ProgramHeadOutcomesView } from "@/features/analytics/components/program-head-outcomes-view";
import { ProgramHeadTrendsView } from "@/features/analytics/components/program-head-trends-view";
import { ProgramHeadStakeholderView } from "@/features/analytics/components/program-head-stakeholder-view";
import { ProgramHeadBreakdownsView } from "@/features/analytics/components/program-head-breakdowns-view";
import {
  getProgramHeadAnalytics,
  getProgramHeadBreakdowns,
  getProgramHeadOutcomes,
  getProgramHeadStakeholders,
  getProgramHeadTrends,
} from "@/features/analytics/services/get-program-head-analytics";
import {
  buildAnalyticsQueryString,
  buildAnalyticsUrl,
  parseAnalyticsSearchParams,
  rawAnalyticsSearchParamsToQueryString,
} from "@/features/analytics/services/program-head-analytics-state";
import type {
  AnalyticsFilterState,
} from "@/features/analytics/services/program-head-analytics-state";
import type {
  ProgramHeadAnalyticsPeriodOptions,
  ProgramHeadAnalyticsScopeSummary,
} from "@/features/analytics/program-head-analytics-types";
import { buildProgramHeadProgramPath } from "@/lib/constants/program-head-routes";

export const metadata = {
  title: "Analytics | Program Head | System CLOIE",
};

/** One resolved view: shared scope plus the tab's own content. */
type ResolvedAnalyticsTab = {
  scope: ProgramHeadAnalyticsScopeSummary;
  periodOptions: ProgramHeadAnalyticsPeriodOptions;
  children: ReactNode;
};

/**
 * Run one tab's authorized read and wrap its DTO in shell content. A null
 * read result (unassigned or malformed Program) resolves to a non-disclosing
 * denial for the caller.
 */
async function withTabData<TData extends { scope: ProgramHeadAnalyticsScopeSummary; periodOptions: ProgramHeadAnalyticsPeriodOptions }>(
  programId: string,
  filters: AnalyticsFilterState,
  read: (programId: string, filters: AnalyticsFilterState) => Promise<TData | null>,
  render: (data: TData) => ReactNode
): Promise<ResolvedAnalyticsTab | null> {
  const data = await read(programId, filters);
  if (!data) {
    return null;
  }
  return {
    scope: data.scope,
    periodOptions: data.periodOptions,
    children: render(data),
  };
}

/**
 * Resolve the selected tab's authorized read into shell content. The default
 * case covers the Overview landing tab and the upcoming Feedback/AI tabs,
 * which still read the Overview scope until their views land.
 */
function resolveAnalyticsTab(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ResolvedAnalyticsTab | null> {
  switch (filters.tab) {
    case "outcomes":
      return withTabData(programId, filters, getProgramHeadOutcomes, (dto) => (
        <ProgramHeadOutcomesView
          programId={programId}
          data={dto}
          resetHref={buildAnalyticsUrl(programId, { tab: "outcomes" })}
        />
      ));
    case "stakeholders":
      return withTabData(programId, filters, getProgramHeadStakeholders, (dto) => (
        <ProgramHeadStakeholderView
          data={dto}
          resetHref={buildAnalyticsUrl(programId, { tab: "stakeholders" })}
        />
      ));
    case "breakdowns":
      return withTabData(programId, filters, getProgramHeadBreakdowns, (dto) => (
        <ProgramHeadBreakdownsView
          programId={programId}
          data={dto}
          resetHref={buildAnalyticsUrl(programId, { tab: "breakdowns" })}
        />
      ));
    case "trends":
      return withTabData(programId, filters, getProgramHeadTrends, (dto) => (
        <ProgramHeadTrendsView
          data={dto}
          resetHref={buildAnalyticsUrl(programId, { tab: "trends" })}
        />
      ));
    default:
      return withTabData(programId, filters, getProgramHeadAnalytics, (dto) => (
        <ProgramHeadOverviewKPIs
          kpi={dto.kpi}
          emptyReason={dto.emptyReason}
          resetHref={buildAnalyticsUrl(programId)}
        />
      ));
  }
}

export default async function SelectedProgramAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ programId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const filters = parseAnalyticsSearchParams(rawSearchParams);

  // Redirect to the canonical URL when raw params contain invalid or non-canonical values
  const rawQuery = rawAnalyticsSearchParamsToQueryString(rawSearchParams);
  const canonicalQuery = buildAnalyticsQueryString(filters);
  if (rawQuery !== canonicalQuery) {
    const basePath = buildProgramHeadProgramPath(programId, "analytics");
    redirect(canonicalQuery ? `${basePath}?${canonicalQuery}` : basePath);
  }

  const tab = await resolveAnalyticsTab(programId, filters);
  if (!tab) {
    notFound();
  }

  return (
    <ProgramHeadAnalyticsShell
      programId={programId}
      filters={filters}
      scope={tab.scope}
      periodOptions={tab.periodOptions}
    >
      {tab.children}
    </ProgramHeadAnalyticsShell>
  );
}
