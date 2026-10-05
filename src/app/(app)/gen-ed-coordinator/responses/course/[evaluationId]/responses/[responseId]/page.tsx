import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ResponseDetail } from "@/features/response-review/components/response-detail";
import { getGenEdResponseDetail } from "@/features/response-review/services/get-gen-ed-response-detail";
import {
  generalEducationResponsesQuery,
  parseGeneralEducationResponsesSearchParams,
} from "@/features/response-review/services/general-education-responses-state";
import {
  GEN_ED_ANALYTICS_PATH,
  buildGenEdResponsesCourseEvaluationPath,
  buildGenEdResponsesPath,
} from "@/lib/constants/gen-ed-routes";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Response", "Gen Ed Coordinator") };

export default async function GenEdCourseResponseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ evaluationId: string; responseId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ evaluationId, responseId }, rawSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const state = parseGeneralEducationResponsesSearchParams(rawSearchParams);
  const response = await getGenEdResponseDetail(responseId);

  if (!response || response.evaluation.id !== evaluationId) {
    notFound();
  }

  // Upward navigation preserves academic-period scope; class-level filters reset.
  const upwardQuery = generalEducationResponsesQuery({
    page: 1,
    termInstanceId: state.termInstanceId,
    schoolYearId: state.schoolYearId,
    semester: state.semester,
  });
  const responsesHref = upwardQuery
    ? `${buildGenEdResponsesPath()}?${upwardQuery}`
    : buildGenEdResponsesPath();
  const evaluationPath = buildGenEdResponsesCourseEvaluationPath(evaluationId);
  const evaluationHref = upwardQuery ? `${evaluationPath}?${upwardQuery}` : evaluationPath;
  const analyticsHref = upwardQuery
    ? `${GEN_ED_ANALYTICS_PATH}?${upwardQuery}`
    : GEN_ED_ANALYTICS_PATH;

  return (
    <ResponseDetail
      response={response}
      evaluationHref={evaluationHref}
      analyticsHref={analyticsHref}
      // General Education CILOs align to Institutional Outcomes, so there is no
      // Program-scoped GO target to deep-link; the badge traces back to the
      // college-wide Analytics period instead.
      outcomeHref={() => analyticsHref}
      breadcrumbs={
        <Breadcrumbs
          className="text-body-sm"
          items={[
            { label: "Responses", href: responsesHref },
            { label: "Course evaluations", href: responsesHref },
            { label: response.evaluation.title, href: evaluationHref },
            { label: response.respondent.name },
          ]}
        />
      }
    />
  );
}
