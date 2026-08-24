import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getProgramHeadResponseDetail } from "@/features/response-review/services/get-program-head-response-detail";
import { ResponseDetail } from "@/features/response-review/components/response-detail";
import { buildAnalyticsUrl } from "@/features/analytics/services/program-head-analytics-state";
import {
  buildProgramHeadResponsesCourseEvaluationPath,
  buildProgramHeadResponsesPath,
} from "@/lib/constants/program-head-routes";

export default async function CourseResponseDetailPage({
  params,
}: {
  params: Promise<{ programId: string; evaluationId: string; responseId: string }>;
}) {
  const { programId, evaluationId, responseId } = await params;
  const response = await getProgramHeadResponseDetail(programId, responseId);

  if (!response || response.evaluation.id !== evaluationId || response.evaluation.type !== "COURSE_BOUND") {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Responses", href: buildProgramHeadResponsesPath(programId) },
        { label: "Course evaluations", href: buildProgramHeadResponsesPath(programId, "course") },
        { label: response.evaluation.title, href: buildProgramHeadResponsesCourseEvaluationPath(programId, evaluationId) },
        { label: response.respondent.name }
      ]} />
      <Button
        render={<Link href={buildProgramHeadResponsesCourseEvaluationPath(programId, evaluationId)} />}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="mr-2 size-4" /> Back to evaluation
      </Button>
      <ResponseDetail
        response={response}
        evaluationHref={buildProgramHeadResponsesCourseEvaluationPath(programId, evaluationId)}
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