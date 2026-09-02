import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CourseEvaluationDetail } from "@/features/response-review/components/course-evaluation-detail";
import { getProgramHeadCourseEvaluationDetail } from "@/features/response-review/services/get-program-head-course-evaluation-detail";
import {
  parseProgramHeadResponsesSearchParams,
  programHeadResponsesQuery,
  buildProgramHeadResponsesUrl,
} from "@/features/analytics/services/program-head-responses-state";
import {
  buildProgramHeadAnalyticsPath,
  buildProgramHeadResponsesCourseResponsePath,
} from "@/lib/constants/program-head-routes";

export default async function CourseEvaluationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string; evaluationId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ programId, evaluationId }, rawSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const state = parseProgramHeadResponsesSearchParams(rawSearchParams);
  const detail = await getProgramHeadCourseEvaluationDetail(programId, evaluationId);

  if (!detail) {
    notFound();
  }

  // Upward navigation preserves period and stakeholder scope; class-level
  // filters reset (§12).
  const upwardState = {
    tab: "course" as const,
    page: 1,
    termInstanceId: state.termInstanceId,
    schoolYearId: state.schoolYearId,
    semester: state.semester,
    stakeholder: state.stakeholder,
  };
  const responsesHref = buildProgramHeadResponsesUrl(programId, upwardState);
  const upwardQuery = programHeadResponsesQuery(upwardState);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Responses", href: responsesHref },
          { label: "Course evaluations", href: responsesHref },
          { label: detail.evaluation.title },
        ]}
      />
      <CourseEvaluationDetail
        detail={detail}
        analyticsHref={`${buildProgramHeadAnalyticsPath(programId)}?tab=feedback`}
        responseHref={(responseId: string) => {
          const path = buildProgramHeadResponsesCourseResponsePath(
            programId,
            evaluationId,
            responseId
          );
          return upwardQuery ? `${path}?${upwardQuery}` : path;
        }}
      />
    </div>
  );
}
