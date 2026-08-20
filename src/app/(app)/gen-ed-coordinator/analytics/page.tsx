import { notFound, redirect } from "next/navigation";
import { GeneralEducationAnalyticsWorkspace } from "@/features/analytics/components/general-education-analytics-workspace";
import { getGeneralEducationAnalytics } from "@/features/analytics/services/general-education-analytics";
import {
  buildGeneralEducationAnalyticsQueryString,
  parseGeneralEducationAnalyticsSearchParams,
  rawGeneralEducationAnalyticsSearchParamsToQueryString,
} from "@/features/analytics/services/general-education-analytics-state";

export const metadata = { title: "Analytics | Gen Ed Coordinator | System CLOIE" };

const BASE_PATH = "/gen-ed-coordinator/analytics";

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
    redirect(canonicalQuery ? `${BASE_PATH}?${canonicalQuery}` : BASE_PATH);
  }
  const data = await getGeneralEducationAnalytics(filters);
  if (!data) notFound();
  return <GeneralEducationAnalyticsWorkspace data={data} filters={filters} />;
}
