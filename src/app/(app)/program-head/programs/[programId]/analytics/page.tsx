import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { ProgramHeadAnalyticsShell } from "@/features/analytics/components/program-head-analytics-shell";
import { ProgramHeadOutcomesView } from "@/features/analytics/components/program-head-outcomes-view";
import { ProgramHeadTrendsView } from "@/features/analytics/components/program-head-trends-view";
import { ProgramHeadStakeholderView } from "@/features/analytics/components/program-head-stakeholder-view";
import { ProgramHeadBreakdownsView } from "@/features/analytics/components/program-head-breakdowns-view";
import { ProgramHeadFeedbackView } from "@/features/analytics/components/program-head-feedback-view";
import { ProgramHeadAIInsightsView } from "@/features/analytics/components/program-head-ai-insights-view";
import { getProgramHeadAnalytics, getProgramHeadBreakdowns, getProgramHeadFeedback, getProgramHeadOutcomes, getProgramHeadStakeholders, getProgramHeadTrends } from "@/features/analytics/services/get-program-head-analytics";
import { ANALYTICS_TABS, buildAnalyticsQueryString, buildAnalyticsUrl, parseAnalyticsSearchParams } from "@/features/analytics/services/program-head-analytics-state";
import type { AnalyticsFilterState } from "@/features/analytics/services/program-head-analytics-state";
import type { ProgramHeadAnalyticsPeriodOptions, ProgramHeadAnalyticsScopeSummary } from "@/features/analytics/program-head-analytics-types";
import { buildProgramHeadDashboardPath, buildProgramHeadProgramPath } from "@/lib/constants/program-head-routes";

export const metadata = { title: "Analytics | Program Head | System CLOIE" };
type Resolved = { scope: ProgramHeadAnalyticsScopeSummary; periodOptions: ProgramHeadAnalyticsPeriodOptions; children: ReactNode; ploCode?: string };
async function withData<T extends { scope: ProgramHeadAnalyticsScopeSummary; periodOptions: ProgramHeadAnalyticsPeriodOptions }>(id: string, filters: AnalyticsFilterState, read: (id: string, filters: AnalyticsFilterState) => Promise<T | null>, render: (data: T) => ReactNode): Promise<Resolved | null> { const data = await read(id, filters); return data ? { scope: data.scope, periodOptions: data.periodOptions, children: render(data) } : null; }
async function resolveOutcomesTab(id: string, filters: AnalyticsFilterState): Promise<Resolved | null> {
  const data = await getProgramHeadOutcomes(id, filters);
  if (!data) return null;
  const ploCode = filters.ploId
    ? data.outcomes.find((outcome) => outcome.ploId === filters.ploId)?.code ??
      data.programWideOutcomes.find((outcome) => outcome.ploId === filters.ploId)?.code
    : undefined;
  return {
    scope: data.scope,
    periodOptions: data.periodOptions,
    ploCode,
    children: (
      <ProgramHeadOutcomesView
        programId={id}
        data={data}
        resetHref={buildAnalyticsUrl(id, { tab: "outcomes" })}
        selectedPloId={filters.ploId}
      />
    ),
  };
}

async function resolveTab(id: string, filters: AnalyticsFilterState): Promise<Resolved | null> {
  switch (filters.tab) {
    case "outcomes": return resolveOutcomesTab(id, filters);
    case "stakeholders": return withData(id, filters, getProgramHeadStakeholders, (dto) => <ProgramHeadStakeholderView data={dto} resetHref={buildAnalyticsUrl(id, { tab: "stakeholders" })} />); case "trends": return withData(id, filters, getProgramHeadTrends, (dto) => <ProgramHeadTrendsView data={dto} resetHref={buildAnalyticsUrl(id, { tab: "trends" })} />); case "ai": return withData(id, filters, getProgramHeadAnalytics, (dto) => <ProgramHeadAIInsightsView programId={id} filters={filters} scope={dto.scope} />); case "courses": return withData(id, filters, getProgramHeadBreakdowns, (dto) => <ProgramHeadBreakdownsView programId={id} data={dto} resetHref={buildAnalyticsUrl(id, { tab: "courses" })} />); case "qualitative": return withData(id, filters, getProgramHeadFeedback, (dto) => <ProgramHeadFeedbackView programId={id} data={dto} resetHref={buildAnalyticsUrl(id, { tab: "qualitative" })} />); default: return Promise.resolve(null); } }

const VALID_RAW_TABS = new Set(["overview", "breakdowns", "feedback", ...ANALYTICS_TABS]);

function firstTrimmed(value: string | string[] | undefined): string | undefined {
  return (Array.isArray(value) ? value[0] : value)?.trim();
}

function legacyRedirectTarget(rawTab: string | undefined): "overview" | "courses" | "qualitative" | "none" {
  if (rawTab === "overview") return "overview";
  if (rawTab === "breakdowns") return "courses";
  if (rawTab === "feedback") return "qualitative";
  return "none";
}

function overviewRedirectUrl(programId: string, filters: AnalyticsFilterState): string {
  const params: Record<string, string> = {};
  if (filters.schoolYearId) params.schoolYearId = filters.schoolYearId;
  if (filters.semester) params.semester = filters.semester;
  if (filters.termInstanceId) params.termInstanceId = filters.termInstanceId;
  const query = new URLSearchParams(params).toString();
  return query ? `${buildProgramHeadDashboardPath(programId)}?${query}` : buildProgramHeadDashboardPath(programId);
}

export default async function SelectedProgramAnalyticsPage({ params, searchParams }: { params: Promise<{ programId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ programId }, raw] = await Promise.all([params, searchParams]);
  const filters = parseAnalyticsSearchParams(raw);
  const rawTab = firstTrimmed(raw.tab);
  if (rawTab && !VALID_RAW_TABS.has(rawTab)) redirect(`${buildProgramHeadProgramPath(programId, "analytics")}?tab=outcomes`);
  const legacy = legacyRedirectTarget(rawTab);
  if (legacy === "overview") redirect(overviewRedirectUrl(programId, filters));
  if (legacy === "courses" || legacy === "qualitative") {
    const base = buildProgramHeadProgramPath(programId, "analytics");
    const query = buildAnalyticsQueryString({ ...filters, tab: legacy });
    redirect(query ? `${base}?${query}` : base);
  }
  const effectiveFilters: AnalyticsFilterState = { ...filters, tab: rawTab === undefined ? "outcomes" : filters.tab };
  const tab = await resolveTab(programId, effectiveFilters);
  if (!tab) notFound();
  return <ProgramHeadAnalyticsShell programId={programId} filters={effectiveFilters} scope={tab.scope} periodOptions={tab.periodOptions} ploCode={tab.ploCode}>{tab.children}</ProgramHeadAnalyticsShell>;
}