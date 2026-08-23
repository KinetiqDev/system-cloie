import { notFound } from "next/navigation";
import { CentralEvaluationDetail } from "@/features/response-review/components/central-evaluation-detail";
import { getProgramHeadCentralEvaluationDetail } from "@/features/response-review/services/get-program-head-central-evaluation-detail";
import {
  buildProgramHeadAnalyticsPath,
  buildProgramHeadResponsesProgramWideResponsePath,
} from "@/lib/constants/program-head-routes";

export default async function CentralEvaluationDetailPage({
  params,
}: {
  params: Promise<{ programId: string; deploymentId: string }>;
}) {
  const { programId, deploymentId } = await params;
  const detail = await getProgramHeadCentralEvaluationDetail(programId, deploymentId);

  if (!detail) {
    notFound();
  }

  return (
    <CentralEvaluationDetail
      detail={detail}
      analyticsHref={`${buildProgramHeadAnalyticsPath(programId)}?tab=feedback`}
      responseHref={(responseId: string) =>
        buildProgramHeadResponsesProgramWideResponsePath(programId, deploymentId, responseId)
      }
    />
  );
}