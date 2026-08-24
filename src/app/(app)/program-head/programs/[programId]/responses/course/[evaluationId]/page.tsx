import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CourseEvaluationDetail } from "@/features/response-review/components/course-evaluation-detail";
import { getProgramHeadCourseEvaluationDetail } from "@/features/response-review/services/get-program-head-course-evaluation-detail";
import {
  buildProgramHeadAnalyticsPath,
  buildProgramHeadResponsesCourseResponsePath,
  buildProgramHeadResponsesPath,
} from "@/lib/constants/program-head-routes";

export default async function CourseEvaluationDetailPage({
  params,
}: {
  params: Promise<{ programId: string; evaluationId: string }>;
}) {
  const { programId, evaluationId } = await params;
  const detail = await getProgramHeadCourseEvaluationDetail(programId, evaluationId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Responses", href: buildProgramHeadResponsesPath(programId) },
          {
            label: "Course evaluations",
            href: buildProgramHeadResponsesPath(programId, "course"),
          },
          { label: detail.evaluation.title },
        ]}
      />
      <CourseEvaluationDetail
        detail={detail}
        analyticsHref={`${buildProgramHeadAnalyticsPath(programId)}?tab=feedback`}
        responseHref={(responseId: string) =>
          buildProgramHeadResponsesCourseResponsePath(programId, evaluationId, responseId)
        }
      />
    </div>
  );
}