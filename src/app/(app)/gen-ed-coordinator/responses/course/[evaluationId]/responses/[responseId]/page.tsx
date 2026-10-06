import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ResponseDetail } from "@/features/response-review/components/response-detail";
import { getGenEdResponseDetail } from "@/features/response-review/services/get-gen-ed-response-detail";
import {
  generalEducationResponsesQuery,
  parseGeneralEducationResponsesSearchParams,
} from "@/features/response-review/services/general-education-responses-state";
import { buildGeneralEducationAnalyticsUrl } from "@/features/analytics/services/general-education-analytics-state";
import {
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
  // Analytics links keep the response's own academic period so an answer badge
  // and the page-level trace resolve to the same scope the evidence came from.
  const analyticsHref = buildGeneralEducationAnalyticsUrl({
    termInstanceId: response.evaluation.context.termInstanceId,
  });

  return (
    <ResponseDetail
      response={response}
      evaluationHref={evaluationHref}
      analyticsHref={analyticsHref}
      // A General Education answer reaches Institutional Learning Outcomes, so
      // each alignment deep-links into that ILO's row in the Coordinator's
      // Outcomes view for this response's term.
      outcomeHref={(iloId) =>
        buildGeneralEducationAnalyticsUrl({
          tab: "outcomes",
          iloId,
          termInstanceId: response.evaluation.context.termInstanceId,
        })
      }
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
