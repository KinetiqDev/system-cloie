import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { ProgramHeadAnalyticsShell } from "@/features/analytics/components/program-head-analytics-shell";
import { ProgramHeadOutcomesView } from "@/features/analytics/components/program-head-outcomes-view";
import { ProgramHeadTrendsView } from "@/features/analytics/components/program-head-trends-view";
import { ProgramHeadBreakdownsView } from "@/features/analytics/components/program-head-breakdowns-view";
import { ProgramHeadFeedbackView } from "@/features/analytics/components/program-head-feedback-view";
import {
  getProgramHeadAnalyticsFrame,
  getProgramHeadBreakdowns,
  getProgramHeadFeedback,
  getProgramHeadOutcomes,
  getProgramHeadTrends,
} from "@/features/analytics/services/get-program-head-analytics";
import {
  buildAnalyticsQueryString,
  buildAnalyticsUrl,
  parseAnalyticsSearchParams,
  toInsightFilters,
  type AnalyticsFilterState,
} from "@/features/analytics/services/program-head-analytics-state";
import {
  buildProgramHeadDashboardPath,
  buildProgramHeadProgramPath,
} from "@/lib/constants/program-head-routes";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Analytics", "Program Head") };

type ResolvedTabContent = { children: ReactNode; poCode?: string };

async function withData<T>(
  programId: string,
  filters: AnalyticsFilterState,
  read: (id: string, state: AnalyticsFilterState) => Promise<T | null>,
  render: (data: T, filters: AnalyticsFilterState) => ReactNode
): Promise<ResolvedTabContent> {
  const data = await read(programId, filters);
  if (!data) notFound();
  return { children: render(data, filters) };
}

async function resolveOutcomesTab(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ResolvedTabContent> {
  const data = await getProgramHeadOutcomes(programId, filters);
  if (!data) notFound();
  const poCode = filters.poId
    ? (data.outcomes.find((outcome) => outcome.outcomeId === filters.poId)?.code ??
      data.programWideOutcomes.find((outcome) => outcome.poId === filters.poId)?.code)
    : undefined;
  return {
    poCode,
    children: (
      <ProgramHeadOutcomesView
        programId={programId}
        data={data}
        resetHref={buildAnalyticsUrl(programId, { tab: "outcomes" })}
        selectedGoId={filters.poId}
        aiFilters={toInsightFilters(filters)}
      />
    ),
  };
}

type TabResolver = (
  programId: string,
  filters: AnalyticsFilterState
) => Promise<ResolvedTabContent>;

function trendsTab(programId: string, filters: AnalyticsFilterState): Promise<ResolvedTabContent> {
  return withData(programId, filters, getProgramHeadTrends, (data, viewFilters) => (
    <ProgramHeadTrendsView
      programId={programId}
      data={data}
      resetHref={buildAnalyticsUrl(programId, { tab: "trends" })}
      aiFilters={toInsightFilters(viewFilters)}
    />
  ));
}

function coursesTab(programId: string, filters: AnalyticsFilterState): Promise<ResolvedTabContent> {
  return withData(programId, filters, getProgramHeadBreakdowns, (data, viewFilters) => (
    <ProgramHeadBreakdownsView
      programId={programId}
      data={data}
      resetHref={buildAnalyticsUrl(programId, { tab: "courses" })}
      aiFilters={toInsightFilters(viewFilters)}
    />
  ));
}

function qualitativeTab(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ResolvedTabContent> {
  return withData(programId, filters, getProgramHeadFeedback, (data, viewFilters) => (
    <ProgramHeadFeedbackView
      programId={programId}
      data={data}
      resetHref={buildAnalyticsUrl(programId, { tab: "qualitative" })}
      aiFilters={toInsightFilters(viewFilters)}
    />
  ));
}

const TAB_RESOLVERS: Record<AnalyticsFilterState["tab"], TabResolver> = {
  outcomes: resolveOutcomesTab,
  trends: trendsTab,
  courses: coursesTab,
  qualitative: qualitativeTab,
};

async function resolveProgramHeadAnalyticsTabContent(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ResolvedTabContent> {
  return TAB_RESOLVERS[filters.tab](programId, filters);
}

const VALID_RAW_TABS: Record<string, true> = {
  overview: true,
  breakdowns: true,
  feedback: true,
  outcomes: true,
  courses: true,
  stakeholders: true,
  trends: true,
  qualitative: true,
};

function firstTrimmed(value: string | string[] | undefined): string | undefined {
  return (Array.isArray(value) ? value[0] : value)?.trim();
}

const LEGACY_TAB_REDIRECTS: Record<string, "overview" | "outcomes" | "courses" | "qualitative"> = {
  overview: "overview",
  breakdowns: "courses",
  stakeholders: "outcomes",
  feedback: "qualitative",
};

function legacyRedirectTarget(
  rawTab: string | undefined
): "overview" | "outcomes" | "courses" | "qualitative" | "none" {
  if (!rawTab) return "none";
  return LEGACY_TAB_REDIRECTS[rawTab] ?? "none";
}

function overviewRedirectUrl(programId: string, filters: AnalyticsFilterState): string {
  const params: Record<string, string> = {};
  if (filters.schoolYearId) params.schoolYearId = filters.schoolYearId;
  if (filters.semester) params.semester = filters.semester;
  if (filters.termInstanceId) params.termInstanceId = filters.termInstanceId;
  const query = new URLSearchParams(params).toString();
  return query
    ? `${buildProgramHeadDashboardPath(programId)}?${query}`
    : buildProgramHeadDashboardPath(programId);
}
function redirectLegacyTab(programId: string, filters: AnalyticsFilterState, rawTab: string): void {
  const legacy = legacyRedirectTarget(rawTab);
  if (legacy === "overview") redirect(overviewRedirectUrl(programId, filters));
  if (legacy === "outcomes" || legacy === "courses" || legacy === "qualitative") {
    const base = buildProgramHeadProgramPath(programId, "analytics");
    const query = buildAnalyticsQueryString({ ...filters, tab: legacy });
    redirect(query ? `${base}?${query}` : base);
  }
}

export default async function SelectedProgramAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ programId }, raw] = await Promise.all([params, searchParams]);
  const filters = parseAnalyticsSearchParams(raw);
  const rawTab = firstTrimmed(raw.tab);
  if (rawTab && !VALID_RAW_TABS[rawTab]) {
    redirect(`${buildProgramHeadProgramPath(programId, "analytics")}?tab=outcomes`);
  }

  if (rawTab) redirectLegacyTab(programId, filters, rawTab);

  const effectiveFilters: AnalyticsFilterState = {
    ...filters,
    tab: rawTab === undefined ? "outcomes" : filters.tab,
  };
  const [frame, tab] = await Promise.all([
    getProgramHeadAnalyticsFrame(programId, effectiveFilters),
    resolveProgramHeadAnalyticsTabContent(programId, effectiveFilters),
  ]);
  if (!frame) notFound();

  return (
    <ProgramHeadAnalyticsShell
      programId={programId}
      filters={effectiveFilters}
      scope={frame.scope}
      poCode={tab.poCode}
      periodOptions={frame.periodOptions}
    >
      {tab.children}
    </ProgramHeadAnalyticsShell>
  );
}
