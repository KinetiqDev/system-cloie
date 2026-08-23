import { redirect } from "next/navigation";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/constants/page-sizes";
import { buildProgramHeadResponsesUrl, parseProgramHeadResponsesSearchParams, programHeadResponsesQuery, rawProgramHeadResponsesQuery } from "./program-head-responses-state";
import { listProgramHeadResponseDeployments } from "./list-program-head-response-deployments";

export async function loadProgramHeadResponsesPage({ programId, rawSearchParams }: { programId: string; rawSearchParams: Record<string, string | string[] | undefined> }) {
  const state = parseProgramHeadResponsesSearchParams(rawSearchParams);
  const rawQuery = rawProgramHeadResponsesQuery(rawSearchParams);
  const canonicalQuery = programHeadResponsesQuery(state);
  if (rawQuery !== canonicalQuery) {
    redirect(buildProgramHeadResponsesUrl(programId, state));
  }
  const data = await listProgramHeadResponseDeployments(programId, state);
  const totalPages = Math.max(1, Math.ceil(data.total / DEFAULT_TABLE_PAGE_SIZE));
  if (state.page > totalPages) redirect(buildProgramHeadResponsesUrl(programId, { ...state, page: totalPages }));
  return { state, data };
}
