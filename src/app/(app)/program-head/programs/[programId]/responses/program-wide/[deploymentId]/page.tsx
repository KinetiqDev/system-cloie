import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CentralEvaluationDetail } from "@/features/response-review/components/central-evaluation-detail";
import { getProgramHeadCentralEvaluationDetail } from "@/features/response-review/services/get-program-head-central-evaluation-detail";
import {
  buildProgramHeadAnalyticsPath,
  buildProgramHeadResponsesPath,
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
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Responses", href: buildProgramHeadResponsesPath(programId) },
          {
            label: "Program-wide evaluations",
            href: buildProgramHeadResponsesPath(programId, "program-wide"),
          },
          { label: detail.evaluation.title },
        ]}
      />
      <CentralEvaluationDetail
        detail={detail}
        analyticsHref={`${buildProgramHeadAnalyticsPath(programId)}?tab=feedback`}
        responseHref={(responseId: string) =>
          buildProgramHeadResponsesProgramWideResponsePath(programId, deploymentId, responseId)
        }
      />
    </div>
  );
}