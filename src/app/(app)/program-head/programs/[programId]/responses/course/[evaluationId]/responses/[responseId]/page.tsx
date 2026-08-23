import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProgramHeadResponseDetail } from "@/features/response-review/services/get-program-head-response-detail";
import { ResponseDetail } from "@/features/response-review/components/response-detail";
import { buildProgramHeadResponsesCourseDetailPath } from "@/lib/constants/program-head-routes";

export default async function CourseResponseDetailPage({
  params,
}: {
  params: Promise<{ programId: string; evaluationId: string; responseId: string }>;
}) {
  const { programId, evaluationId, responseId } = await params;
  const response = await getProgramHeadResponseDetail(programId, responseId);

  if (!response || response.evaluation.id !== evaluationId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Button
        render={<Link href={buildProgramHeadResponsesCourseDetailPath(programId, evaluationId)} />}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="mr-2 size-4" /> Back to evaluation
      </Button>
      <ResponseDetail
        response={response}
        evaluationHref={buildProgramHeadResponsesCourseDetailPath(programId, evaluationId)}
      />
    </div>
  );
}