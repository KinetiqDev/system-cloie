import { notFound } from "next/navigation";
import { CourseEvaluationDetail } from "@/features/response-review/components/course-evaluation-detail";
import { getProgramHeadCourseEvaluationDetail } from "@/features/response-review/services/get-program-head-course-evaluation-detail";
import {
  buildProgramHeadAnalyticsPath,
  buildProgramHeadResponsesCourseResponsePath,
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
    <CourseEvaluationDetail
      detail={detail}
      analyticsHref={`${buildProgramHeadAnalyticsPath(programId)}?tab=feedback`}
      responseHref={(responseId: string) =>
        buildProgramHeadResponsesCourseResponsePath(programId, evaluationId, responseId)
      }
    />
  );
}