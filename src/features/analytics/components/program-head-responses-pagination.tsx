"use client";

import { useRouter } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";
import { buildProgramHeadResponsesPageUrl } from "@/features/analytics/services/program-head-responses-state";
import type { ProgramHeadResponsesFilterState } from "@/features/analytics/services/program-head-responses-state";

export function ProgramHeadResponsesPagination({
  programId,
  state,
  totalPages,
}: {
  programId: string;
  state: ProgramHeadResponsesFilterState;
  totalPages: number;
}) {
  const router = useRouter();
  return (
    <Pagination
      currentPage={state.page}
      totalPages={totalPages}
      onPageChange={(page) => router.push(buildProgramHeadResponsesPageUrl(programId, state, page))}
    />
  );
}
