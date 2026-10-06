import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { GeneralEducationAnalyticsShell } from "@/features/analytics/components/general-education-analytics-shell";
import { GeneralEducationOutcomesView } from "@/features/analytics/components/general-education-outcomes-view";
import { GeneralEducationCoursesView } from "@/features/analytics/components/general-education-courses-view";
import { GeneralEducationProgramsView } from "@/features/analytics/components/general-education-programs-view";
import { GeneralEducationTrendsView } from "@/features/analytics/components/general-education-trends-view";
import { GeneralEducationFeedbackView } from "@/features/analytics/components/general-education-feedback-view";
import {
  getGeneralEducationAnalyticsFrame,
  getGeneralEducationCourses,
  getGeneralEducationFeedback,
  getGeneralEducationOutcomes,
  getGeneralEducationPrograms,
  getGeneralEducationTrends,
} from "@/features/analytics/services/general-education-analytics";
import {
  buildGeneralEducationAnalyticsQueryString,
  buildGeneralEducationAnalyticsUrl,
  parseGeneralEducationAnalyticsSearchParams,
  rawGeneralEducationAnalyticsSearchParamsToQueryString,
  type GeneralEducationAnalyticsFilterState,
} from "@/features/analytics/services/general-education-analytics-state";
import { buildPageTitle } from "@/lib/page-title";
import { GEN_ED_ANALYTICS_PATH } from "@/lib/constants/gen-ed-routes";

export const metadata = {
  title: buildPageTitle("General Education analytics", "Gen Ed Coordinator"),
};

/** Reset link for an empty state: same view, every facet cleared. */
function resetHref(filters: GeneralEducationAnalyticsFilterState): string {
  return buildGeneralEducationAnalyticsUrl({ tab: filters.tab });
}

/**
 * Each view resolves its own re-authorized read beside the shared frame read.
 * The frame and the filter card stay mounted while only the evidence region
 * shows tab-shaped loading geometry, so applying a filter never replaces the
 * whole workspace.
 */
async function resolveView(filters: GeneralEducationAnalyticsFilterState): Promise<ReactNode> {
  switch (filters.tab) {
    case "outcomes": {
      const data = await getGeneralEducationOutcomes(filters);
      if (!data) notFound();
      return (
        <GeneralEducationOutcomesView
          data={data}
          resetHref={resetHref(filters)}
          filters={filters}
        />
      );
    }
    case "courses": {
      const data = await getGeneralEducationCourses(filters);
      if (!data) notFound();
      return (
        <GeneralEducationCoursesView
          rows={data.rows}
          emptyReason={data.emptyReason}
          resetHref={resetHref(filters)}
          filters={filters}
        />
      );
    }
    case "programs": {
      const data = await getGeneralEducationPrograms(filters);
      if (!data) notFound();
      return (
        <GeneralEducationProgramsView
          data={data}
          resetHref={resetHref(filters)}
          filters={filters}
        />
      );
    }
    case "trends": {
      const data = await getGeneralEducationTrends(filters);
      if (!data) notFound();
      return (
        <GeneralEducationTrendsView data={data} resetHref={resetHref(filters)} filters={filters} />
      );
    }
    case "qualitative": {
      const data = await getGeneralEducationFeedback(filters);
      if (!data) notFound();
      return (
        <GeneralEducationFeedbackView
          data={data}
          resetHref={resetHref(filters)}
          filters={filters}
        />
      );
    }
  }
}

export default async function GenEdCoordinatorAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters = parseGeneralEducationAnalyticsSearchParams(raw);
  const rawQuery = rawGeneralEducationAnalyticsSearchParamsToQueryString(raw);
  const canonicalQuery = buildGeneralEducationAnalyticsQueryString(filters);
  if (rawQuery !== canonicalQuery) {
    redirect(canonicalQuery ? `${GEN_ED_ANALYTICS_PATH}?${canonicalQuery}` : GEN_ED_ANALYTICS_PATH);
  }

  const [frame, view] = await Promise.all([
    getGeneralEducationAnalyticsFrame(filters),
    resolveView(filters),
  ]);
  if (!frame) notFound();

  return (
    <GeneralEducationAnalyticsShell
      filters={filters}
      scope={frame.scope}
      kpi={frame.kpi}
      options={frame.options}
    >
      {view}
    </GeneralEducationAnalyticsShell>
  );
}
