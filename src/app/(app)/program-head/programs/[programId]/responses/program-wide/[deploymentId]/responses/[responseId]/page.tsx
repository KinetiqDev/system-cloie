import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getProgramHeadResponseDetail } from "@/features/response-review/services/get-program-head-response-detail";
import { ResponseDetail } from "@/features/response-review/components/response-detail";
import { buildAnalyticsUrl } from "@/features/analytics/services/program-head-analytics-state";
import {
  buildProgramHeadResponsesPath,
  buildProgramHeadResponsesProgramWideDeploymentPath,
} from "@/lib/constants/program-head-routes";

export default async function CentralResponseDetailPage({
  params,
}: {
  params: Promise<{ programId: string; deploymentId: string; responseId: string }>;
}) {
  const { programId, deploymentId, responseId } = await params;
  const response = await getProgramHeadResponseDetail(programId, responseId);

  if (!response || response.evaluation.id !== deploymentId || response.evaluation.type !== "PROGRAM_WIDE") {
    notFound();
  }

  const stakeholder = response.evaluation.context.stakeholder;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Responses", href: buildProgramHeadResponsesPath(programId) },
          {
            label: "Program-wide evaluations",
            href: buildProgramHeadResponsesPath(programId, "program-wide"),
          },
          {
            label: response.evaluation.title,
            href: buildProgramHeadResponsesProgramWideDeploymentPath(programId, deploymentId),
          },
          { label: response.respondent.name },
        ]}
      />
      <Button
        render={
          <Link href={buildProgramHeadResponsesProgramWideDeploymentPath(programId, deploymentId)} />
        }
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="mr-2 size-4" /> Back to evaluation
      </Button>
      <ResponseDetail
        response={response}
        evaluationHref={buildProgramHeadResponsesProgramWideDeploymentPath(programId, deploymentId)}
        analyticsHref={buildAnalyticsUrl(programId, {
          tab: "outcomes",
          evidenceSource:
            stakeholder === "STUDENT"
              ? "PROGRAM_WIDE_STUDENT"
              : stakeholder === "ALUMNI"
                ? "ALUMNI"
                : "INDUSTRY",
          stakeholder,
        })}
        programId={programId}
      />
    </div>
  );
}