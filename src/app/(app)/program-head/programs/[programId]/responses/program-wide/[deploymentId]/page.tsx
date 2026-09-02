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
  buildProgramHeadToolsPath,
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
  const openedFromTools = "from" in rawSearchParams && rawSearchParams.from === "tools";
  const toolsHref = `${buildProgramHeadToolsPath(programId)}?tab=published`;
  const detail = await getProgramHeadCentralEvaluationDetail(programId, deploymentId);

  if (!detail) {
    notFound();
  }

  // Upward navigation preserves period and stakeholder scope; class-level
  // filters reset (§12).
  const upwardState = {
    tab: "program-wide" as const,
    page: 1,
    termInstanceId: state.termInstanceId,
    schoolYearId: state.schoolYearId,
    semester: state.semester,
    stakeholder: state.stakeholder,
  };
  const responsesHref = buildProgramHeadResponsesUrl(programId, upwardState);
  const upwardQuery = programHeadResponsesQuery(upwardState);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Breadcrumbs
        items={
          openedFromTools
            ? [
                { label: "Evaluation Tools", href: toolsHref },
                { label: "Published", href: toolsHref },
                { label: detail.evaluation.title },
              ]
            : [
                { label: "Responses", href: responsesHref },
                { label: "Program-wide evaluations", href: responsesHref },
                { label: detail.evaluation.title },
              ]
        }
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
          if (openedFromTools) return `${path}?from=tools`;
          return upwardQuery ? `${path}?${upwardQuery}` : path;
        }}
      />
    </div>
  );
}
