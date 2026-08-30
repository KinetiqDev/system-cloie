import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getProgramHeadResponseDetail } from "@/features/response-review/services/get-program-head-response-detail";
import { ResponseDetail } from "@/features/response-review/components/response-detail";
import {
  parseProgramHeadResponsesSearchParams,
  programHeadResponsesQuery,
  buildProgramHeadResponsesUrl,
} from "@/features/analytics/services/program-head-responses-state";
import {
  STAKEHOLDER_EVIDENCE_SOURCE,
  buildAnalyticsUrl,
} from "@/features/analytics/services/program-head-analytics-state";
import {
  buildProgramHeadResponsesProgramWideDeploymentPath,
  buildProgramHeadToolsPath,
} from "@/lib/constants/program-head-routes";

export default async function CentralResponseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string; deploymentId: string; responseId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ programId, deploymentId, responseId }, rawSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const state = parseProgramHeadResponsesSearchParams(rawSearchParams);
  const openedFromTools = "from" in rawSearchParams && rawSearchParams.from === "tools";
  const response = await getProgramHeadResponseDetail(programId, responseId);

  if (
    !response ||
    response.evaluation.id !== deploymentId ||
    response.evaluation.type !== "PROGRAM_WIDE"
  ) {
    notFound();
  }

  const stakeholder = response.evaluation.context.stakeholder;

  // Upward navigation preserves period and stakeholder scope; class-level
  // filters reset (§12).
  const upwardState = {
    tab: "program-wide" as const,
    page: 1,
    schoolYearId: state.schoolYearId,
    semester: state.semester,
    termInstanceId: state.termInstanceId,
    stakeholder,
  };
  const responsesHref = buildProgramHeadResponsesUrl(programId, upwardState);
  const evaluationPath = buildProgramHeadResponsesProgramWideDeploymentPath(
    programId,
    deploymentId
  );
  const upwardQuery = programHeadResponsesQuery(upwardState);
  const toolsHref = `${buildProgramHeadToolsPath(programId)}?tab=published`;
  const evaluationHref = openedFromTools
    ? `${evaluationPath}?from=tools`
    : upwardQuery
      ? `${evaluationPath}?${upwardQuery}`
      : evaluationPath;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Breadcrumbs
        items={
          openedFromTools
            ? [
                { label: "Evaluation Tools", href: toolsHref },
                { label: response.evaluation.title, href: evaluationHref },
                { label: response.respondent.name },
              ]
            : [
                { label: "Responses", href: responsesHref },
                { label: "Program-wide evaluations", href: responsesHref },
                { label: response.evaluation.title, href: evaluationHref },
                { label: response.respondent.name },
              ]
        }
      />
      <div>
        <Button render={<Link href={evaluationHref} />} variant="outline" size="sm">
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to Evaluation
        </Button>
      </div>
      <ResponseDetail
        response={response}
        evaluationHref={evaluationHref}
        analyticsHref={buildAnalyticsUrl(programId, {
          tab: "outcomes",
          evidenceSource: STAKEHOLDER_EVIDENCE_SOURCE[stakeholder],
          stakeholder,
          termInstanceId: response.evaluation.context.termInstanceId,
        })}
        programId={programId}
      />
    </div>
  );
}
