"use client";

import {
  buildProgramHeadResponsesPageUrl,
  type ProgramHeadResponsesFilterState,
} from "@/features/analytics/services/program-head-responses-state";
import { ResponsesPagination } from "@/features/response-review/components/responses-pagination";

export function ProgramHeadResponsesPagination({
  programId,
  state,
  totalPages,
}: {
  programId: string;
  state: ProgramHeadResponsesFilterState;
  totalPages: number;
}) {
  return (
    <ResponsesPagination
      page={state.page}
      totalPages={totalPages}
      buildPageUrl={(page) => buildProgramHeadResponsesPageUrl(programId, state, page)}
    />
  );
}
