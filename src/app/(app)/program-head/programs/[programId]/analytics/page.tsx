import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { ProgramHeadAnalyticsShell } from "@/features/analytics/components/program-head-analytics-shell";
import { ProgramHeadOutcomesView } from "@/features/analytics/components/program-head-outcomes-view";
import { ProgramHeadTrendsView } from "@/features/analytics/components/program-head-trends-view";
import { ProgramHeadStakeholderView } from "@/features/analytics/components/program-head-stakeholder-view";
import { ProgramHeadBreakdownsView } from "@/features/analytics/components/program-head-breakdowns-view";
import { ProgramHeadFeedbackView } from "@/features/analytics/components/program-head-feedback-view";
import { ProgramHeadAIInsightsView } from "@/features/analytics/components/program-head-ai-insights-view";
import {
  getProgramHeadAnalyticsFrame,
  getProgramHeadBreakdowns,
  getProgramHeadFeedback,
  getProgramHeadOutcomes,
  getProgramHeadStakeholders,
  getProgramHeadTrends,
} from "@/features/analytics/services/get-program-head-analytics";
import {
  buildAnalyticsQueryString,
  buildAnalyticsUrl,
  parseAnalyticsSearchParams,
} from "@/features/analytics/services/program-head-analytics-state";
import type { AnalyticsFilterState } from "@/features/analytics/services/program-head-analytics-state";
import {
  buildProgramHeadDashboardPath,
  buildProgramHeadProgramPath,
} from "@/lib/constants/program-head-routes";

export const metadata = { title: "Analytics | Program Head | System CLOIE" };

type ResolvedTabContent = { children: ReactNode; ploCode?: string };

async function withData<T>(
  programId: string,
  filters: AnalyticsFilterState,
  read: (id: string, state: AnalyticsFilterState) => Promise<T | null>,
  render: (data: T) => ReactNode
): Promise<ResolvedTabContent> {
  const data = await read(programId, filters);
  if (!data) notFound();
  return { children: render(data) };
}

async function resolveOutcomesTab(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ResolvedTabContent> {
  const data = await getProgramHeadOutcomes(programId, filters);
  if (!data) notFound();
  const ploCode = filters.ploId
    ? (data.outcomes.find((outcome) => outcome.ploId === filters.ploId)?.code ??
      data.programWideOutcomes.find((outcome) => outcome.ploId === filters.ploId)?.code)
    : undefined;
  return {
    ploCode,
    children: (
      <ProgramHeadOutcomesView
        programId={programId}
        data={data}
        resetHref={buildAnalyticsUrl(programId, { tab: "outcomes" })}
        selectedPloId={filters.ploId}
      />
    ),
  };
}

async function resolveProgramHeadAnalyticsTabContent(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ResolvedTabContent> {
  switch (filters.tab) {
    case "outcomes":
      return resolveOutcomesTab(programId, filters);
    case "stakeholders":
      return withData(programId, filters, getProgramHeadStakeholders, (data) => (
        <ProgramHeadStakeholderView
          data={data}
          resetHref={buildAnalyticsUrl(programId, { tab: "stakeholders" })}
        />
      ));
    case "trends":
      return withData(programId, filters, getProgramHeadTrends, (data) => (
        <ProgramHeadTrendsView
          data={data}
          resetHref={buildAnalyticsUrl(programId, { tab: "trends" })}
        />
      ));
    case "courses":
      return withData(programId, filters, getProgramHeadBreakdowns, (data) => (
        <ProgramHeadBreakdownsView
          programId={programId}
          data={data}
          resetHref={buildAnalyticsUrl(programId, { tab: "courses" })}
        />
      ));
    case "qualitative":
      return withData(programId, filters, getProgramHeadFeedback, (data) => (
        <ProgramHeadFeedbackView
          programId={programId}
          data={data}
          resetHref={buildAnalyticsUrl(programId, { tab: "qualitative" })}
        />
      ));
    case "ai": {
      const frame = await getProgramHeadAnalyticsFrame(programId, filters);
      if (!frame) notFound();
      return {
        children: (
          <ProgramHeadAIInsightsView programId={programId} filters={filters} scope={frame.scope} />
        ),
      };
    }
  }
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
  ai: true,
};

function firstTrimmed(value: string | string[] | undefined): string | undefined {
  return (Array.isArray(value) ? value[0] : value)?.trim();
}

function legacyRedirectTarget(
  rawTab: string | undefined
): "overview" | "courses" | "qualitative" | "none" {
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
  return query
    ? `${buildProgramHeadDashboardPath(programId)}?${query}`
    : buildProgramHeadDashboardPath(programId);
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

  const legacy = legacyRedirectTarget(rawTab);
  if (legacy === "overview") redirect(overviewRedirectUrl(programId, filters));
  if (legacy === "courses" || legacy === "qualitative") {
    const base = buildProgramHeadProgramPath(programId, "analytics");
    const query = buildAnalyticsQueryString({ ...filters, tab: legacy });
    redirect(query ? `${base}?${query}` : base);
  }

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
      ploCode={tab.ploCode}
      periodOptions={frame.periodOptions}
    >
      {tab.children}
    </ProgramHeadAnalyticsShell>
  );
}
