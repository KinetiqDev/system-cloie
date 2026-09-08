import { notFound } from "next/navigation";
import { ProgramHeadToolsPage } from "@/features/instruments/components/program-head-tools-page";
import {
  parsePublishedEvaluationFilters,
  parseToolsViewState,
} from "@/features/instruments/components/tools-view-state";
import { listInstitutionalBaselines } from "@/features/instruments/services/list-institutional-baselines";
import { listProgramHeadTemplates } from "@/features/instruments/services/manage-program-head-templates";
import { listProgramHeadDeployments } from "@/features/evaluations/services/list-program-head-deployments";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Evaluation Tools", "Program Head") };

export default async function SelectedProgramToolsPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ programId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const [templatesResult, deploymentsResult, baselines] = await Promise.all([
    listProgramHeadTemplates(programId),
    listProgramHeadDeployments(programId),
    listInstitutionalBaselines(),
  ]);

  if (!templatesResult.success || !deploymentsResult.success) notFound();

  const { initialTab, initialView } = parseToolsViewState(rawSearchParams);
  const initialPublishedFilters = parsePublishedEvaluationFilters(rawSearchParams);

  return (
    <ProgramHeadToolsPage
      templates={templatesResult.data.templates}
      deployments={deploymentsResult.data.deployments}
      baselines={baselines}
      program={templatesResult.data.program}
      initialTab={initialTab}
      initialView={initialView}
      initialPublishedFilters={initialPublishedFilters}
    />
  );
}
