import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnonymizedResponseDetail } from "@/features/analytics/components/anonymized-response-detail";
import { getCourseBoundResponseReview } from "@/features/analytics/services/get-course-bound-response-review";
import { buildProgramHeadCiloReviewDetailPath } from "@/lib/constants/program-head-routes";

export default async function SelectedProgramCiloResponsePage({
  params,
}: {
  params: Promise<{ programId: string; evaluationId: string; responseId: string }>;
}) {
  const { evaluationId, programId, responseId } = await params;
  const response = await getCourseBoundResponseReview(responseId, programId);

  if (!response || response.evaluationId !== evaluationId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Button
        render={<Link href={buildProgramHeadCiloReviewDetailPath(programId, evaluationId)} />}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="mr-2 size-4" /> Back to Evaluation
      </Button>

      <AnonymizedResponseDetail response={response} />
    </div>
  );
}
