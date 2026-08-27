import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnonymizedResponseDetail } from "@/features/analytics/components/anonymized-response-detail";
import { getCourseBoundResponseReview } from "@/features/analytics/services/get-course-bound-response-review";

export default async function FacultyCiloResponsePage({
  params,
}: {
  params: Promise<{ evaluationId: string; responseId: string }>;
}) {
  const { evaluationId, responseId } = await params;
  const response = await getCourseBoundResponseReview(responseId);

  if (!response || response.evaluationId !== evaluationId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={`/faculty/cilo-evaluations/${evaluationId}`} />}
      >
        <ArrowLeft className="mr-2 size-4" /> Back to Evaluation
      </Button>

      <AnonymizedResponseDetail response={response} />
    </div>
  );
}
