import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CourseEvaluationDetail } from "@/features/response-review/components/course-evaluation-detail";
import { getGenEdCourseEvaluationDetail } from "@/features/response-review/services/get-gen-ed-course-evaluation-detail";
import {
  buildGeneralEducationResponsesUrl,
  generalEducationResponsesQuery,
  parseGeneralEducationResponsesSearchParams,
} from "@/features/response-review/services/general-education-responses-state";
import {
  GEN_ED_ANALYTICS_PATH,
  buildGenEdResponsesCourseResponsePath,
} from "@/lib/constants/gen-ed-routes";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Evaluation Responses", "Gen Ed Coordinator"),
};

export default async function GenEdCourseEvaluationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ evaluationId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ evaluationId }, rawSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const state = parseGeneralEducationResponsesSearchParams(rawSearchParams);
  const detail = await getGenEdCourseEvaluationDetail(evaluationId);

  if (!detail) {
    notFound();
  }

  // Upward navigation preserves academic-period scope; class-level filters
  // reset, matching the Program Head review flow.
  const upwardState = {
    page: 1,
    termInstanceId: state.termInstanceId,
    schoolYearId: state.schoolYearId,
    semester: state.semester,
  };
  const upwardQuery = generalEducationResponsesQuery(upwardState);
  const responsesHref = buildGeneralEducationResponsesUrl(upwardState);

  return (
    <CourseEvaluationDetail
      detail={detail}
      analyticsHref={
        upwardQuery ? `${GEN_ED_ANALYTICS_PATH}?${upwardQuery}` : GEN_ED_ANALYTICS_PATH
      }
      breadcrumbs={
        <Breadcrumbs
          className="text-body-sm"
          items={[
            { label: "Responses", href: responsesHref },
            { label: "Course evaluations", href: responsesHref },
            { label: detail.evaluation.title },
          ]}
        />
      }
      responseHref={(responseId: string) => {
        const path = buildGenEdResponsesCourseResponsePath(evaluationId, responseId);
        return upwardQuery ? `${path}?${upwardQuery}` : path;
      }}
    />
  );
}
