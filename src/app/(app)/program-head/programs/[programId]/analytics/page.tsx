import { notFound, redirect } from "next/navigation";
import { ProgramHeadAnalyticsShell } from "@/features/analytics/components/program-head-analytics-shell";
import { ProgramHeadOverviewKPIs } from "@/features/analytics/components/program-head-overview-kpis";
import { ProgramHeadTrendsView } from "@/features/analytics/components/program-head-trends-view";
import {
  getProgramHeadAnalytics,
  getProgramHeadTrends,
} from "@/features/analytics/services/get-program-head-analytics";
import {
  buildAnalyticsQueryString,
  buildAnalyticsUrl,
  parseAnalyticsSearchParams,
  rawAnalyticsSearchParamsToQueryString,
} from "@/features/analytics/services/program-head-analytics-state";
import { buildProgramHeadProgramPath } from "@/lib/constants/program-head-routes";

export const metadata = {
  title: "Analytics | Program Head | System CLOIE",
};

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

  if (filters.tab === "trends") {
    const trends = await getProgramHeadTrends(programId, filters);
    if (!trends) {
      notFound();
    }

    return (
      <ProgramHeadAnalyticsShell
        programId={programId}
        filters={filters}
        scope={trends.scope}
        periodOptions={trends.periodOptions}
      >
        <ProgramHeadTrendsView
          data={trends}
          resetHref={buildAnalyticsUrl(programId, { tab: "trends" })}
        />
      </ProgramHeadAnalyticsShell>
    );
  }

  const data = await getProgramHeadAnalytics(programId, filters);

  if (!data) {
    notFound();
  }

  return (
    <ProgramHeadAnalyticsShell
      programId={programId}
      filters={filters}
      scope={data.scope}
      periodOptions={data.periodOptions}
    >
      <ProgramHeadOverviewKPIs
        kpi={data.kpi}
        emptyReason={data.emptyReason}
        resetHref={buildAnalyticsUrl(programId)}
      />
    </ProgramHeadAnalyticsShell>
  );
}
