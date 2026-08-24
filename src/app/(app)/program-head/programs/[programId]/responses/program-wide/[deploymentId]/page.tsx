import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CentralEvaluationDetail } from "@/features/response-review/components/central-evaluation-detail";
import { getProgramHeadCentralEvaluationDetail } from "@/features/response-review/services/get-program-head-central-evaluation-detail";
import { parseProgramHeadResponsesSearchParams } from "@/features/analytics/services/program-head-responses-state";
import { buildProgramHeadResponsesUrl } from "@/features/analytics/services/program-head-responses-state";
import {
  buildProgramHeadAnalyticsPath,
  buildProgramHeadResponsesProgramWideResponsePath,
} from "@/lib/constants/program-head-routes";

export default async function CentralEvaluationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string; deploymentId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ programId, deploymentId }, rawSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const state = parseProgramHeadResponsesSearchParams(rawSearchParams);
  const detail = await getProgramHeadCentralEvaluationDetail(programId, deploymentId);

  if (!detail) {
    notFound();
  }

  // Upward navigation preserves period and stakeholder scope; class-level
  // filters reset (§12).
  const responsesHref = buildProgramHeadResponsesUrl(programId, {
    tab: "program-wide",
    page: 1,
    schoolYearId: state.schoolYearId,
    semester: state.semester,
    termInstanceId: state.termInstanceId,
    stakeholder: state.stakeholder,
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Responses", href: responsesHref },
          { label: "Program-wide evaluations", href: responsesHref },
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
