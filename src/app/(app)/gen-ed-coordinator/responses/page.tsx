import { notFound, redirect } from "next/navigation";
import { GeneralEducationResponsesLanding } from "@/features/response-review/components/general-education-responses-landing";
import {
  buildGeneralEducationResponsesUrl,
  generalEducationResponsesQuery,
  parseGeneralEducationResponsesSearchParams,
  rawGeneralEducationResponsesQuery,
  type GeneralEducationResponsesFilterState,
} from "@/features/response-review/services/general-education-responses-state";
import { listGeneralEducationEvaluations } from "@/features/response-review/services/list-general-education-evaluations";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/constants/page-sizes";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Responses", "Gen Ed Coordinator") };

export default async function GenEdCoordinatorResponsesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await searchParams;
  const state = parseGeneralEducationResponsesSearchParams(rawSearchParams);

  if (
    rawGeneralEducationResponsesQuery(rawSearchParams) !== generalEducationResponsesQuery(state)
  ) {
    redirect(buildGeneralEducationResponsesUrl(state));
  }

  const data = await listGeneralEducationEvaluations(state);
  if (!data) notFound();

  const totalPages = Math.max(1, Math.ceil(data.total / DEFAULT_TABLE_PAGE_SIZE));
  if (state.page > totalPages) {
    redirect(buildGeneralEducationResponsesUrl({ ...state, page: totalPages }));
  }

  return (
    <GeneralEducationResponsesLanding state={state} data={data} upwardState={upwardScope(state)} />
  );
}

/** Upward navigation from a detail page preserves the academic-period scope only. */
function upwardScope(state: GeneralEducationResponsesFilterState) {
  return generalEducationResponsesQuery({
    page: 1,
    termInstanceId: state.termInstanceId,
    schoolYearId: state.schoolYearId,
    semester: state.semester,
  });
}
