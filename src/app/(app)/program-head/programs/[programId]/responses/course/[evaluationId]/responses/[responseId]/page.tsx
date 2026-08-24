import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getProgramHeadResponseDetail } from "@/features/response-review/services/get-program-head-response-detail";
import { ResponseDetail } from "@/features/response-review/components/response-detail";
import {
  parseProgramHeadResponsesSearchParams,
  programHeadResponsesQuery,
  buildProgramHeadResponsesUrl,
} from "@/features/analytics/services/program-head-responses-state";
import { buildAnalyticsUrl } from "@/features/analytics/services/program-head-analytics-state";
import { buildProgramHeadResponsesCourseEvaluationPath } from "@/lib/constants/program-head-routes";

export default async function CourseResponseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string; evaluationId: string; responseId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ programId, evaluationId, responseId }, rawSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const state = parseProgramHeadResponsesSearchParams(rawSearchParams);
  const response = await getProgramHeadResponseDetail(programId, responseId);

  if (!response || response.evaluation.id !== evaluationId || response.evaluation.type !== "COURSE_BOUND") {
    notFound();
  }

  // Upward navigation preserves period and stakeholder scope; class-level
  // filters reset (§12).
  const upwardState = {
    tab: "course" as const,
    page: 1,
    schoolYearId: state.schoolYearId,
    semester: state.semester,
    termInstanceId: state.termInstanceId,
    stakeholder: state.stakeholder,
  };
  const responsesHref = buildProgramHeadResponsesUrl(programId, upwardState);
  const evaluationPath = buildProgramHeadResponsesCourseEvaluationPath(programId, evaluationId);
  const upwardQuery = programHeadResponsesQuery(upwardState);
  const evaluationHref = upwardQuery ? `${evaluationPath}?${upwardQuery}` : evaluationPath;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Responses", href: responsesHref },
          { label: "Course evaluations", href: responsesHref },
          { label: response.evaluation.title, href: evaluationHref },
          { label: response.respondent.name },
        ]}
      />
      <Button render={<Link href={evaluationHref} />} size="sm" variant="ghost">
        <ArrowLeft className="mr-2 size-4" /> Back to evaluation
      </Button>
      <ResponseDetail
        response={response}
        evaluationHref={evaluationHref}
        analyticsHref={buildAnalyticsUrl(programId, {
          tab: "outcomes",
          evidenceSource: "COURSE",
          termInstanceId: response.evaluation.context.termInstanceId,
        })}
        programId={programId}
      />
    </div>
  );
}
