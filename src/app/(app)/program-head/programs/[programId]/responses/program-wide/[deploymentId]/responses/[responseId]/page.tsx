import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProgramHeadResponseDetail } from "@/features/response-review/services/get-program-head-response-detail";
import { ResponseDetail } from "@/features/response-review/components/response-detail";
import { buildProgramHeadResponsesProgramWideDetailPath } from "@/lib/constants/program-head-routes";

export default async function CentralResponseDetailPage({
  params,
}: {
  params: Promise<{ programId: string; deploymentId: string; responseId: string }>;
}) {
  const { programId, deploymentId, responseId } = await params;
  const response = await getProgramHeadResponseDetail(programId, responseId);

  if (!response || response.evaluation.id !== deploymentId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Button
        render={
          <Link href={buildProgramHeadResponsesProgramWideDetailPath(programId, deploymentId)} />
        }
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="mr-2 size-4" /> Back to evaluation
      </Button>
      <ResponseDetail
        response={response}
        evaluationHref={buildProgramHeadResponsesProgramWideDetailPath(programId, deploymentId)}
      />
    </div>
  );
}