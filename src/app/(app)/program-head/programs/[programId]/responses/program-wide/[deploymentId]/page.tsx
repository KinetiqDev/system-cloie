import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CentralEvaluationDetail } from "@/features/response-review/components/central-evaluation-detail";
import { getProgramHeadCentralEvaluationDetail } from "@/features/response-review/services/get-program-head-central-evaluation-detail";
import {
  parseProgramHeadResponsesSearchParams,
  programHeadResponsesQuery,
  buildProgramHeadResponsesUrl,
} from "@/features/analytics/services/program-head-responses-state";
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
  const upwardState = {
    tab: "program-wide" as const,
    page: 1,
    schoolYearId: state.schoolYearId,
    semester: state.semester,
    termInstanceId: state.termInstanceId,
    stakeholder: state.stakeholder,
  };
  const responsesHref = buildProgramHeadResponsesUrl(programId, upwardState);
  const upwardQuery = programHeadResponsesQuery(upwardState);

  return (
    <div className="flex min-w-0 flex-col gap-6">
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
        responseHref={(responseId: string) => {
          const path = buildProgramHeadResponsesProgramWideResponsePath(
            programId,
            deploymentId,
            responseId
          );
          return upwardQuery ? `${path}?${upwardQuery}` : path;
        }}
      />
    </div>
  );
}
