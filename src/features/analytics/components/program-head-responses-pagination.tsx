"use client";

import { Pagination } from "@/components/ui/pagination";
import { buildProgramHeadResponsesPageUrl } from "@/features/analytics/services/program-head-responses-state";
import type { ProgramHeadResponsesFilterState } from "@/features/analytics/services/program-head-responses-state";
import { useProgramHeadResponsesNavigation } from "./program-head-responses-workspace";

export function ProgramHeadResponsesPagination({
  programId,
  state,
  totalPages,
}: {
  programId: string;
  state: ProgramHeadResponsesFilterState;
  totalPages: number;
}) {
  const { navigate } = useProgramHeadResponsesNavigation();
  return (
    <Pagination
      currentPage={state.page}
      totalPages={totalPages}
      onPageChange={(page) => navigate(buildProgramHeadResponsesPageUrl(programId, state, page))}
    />
  );
}
