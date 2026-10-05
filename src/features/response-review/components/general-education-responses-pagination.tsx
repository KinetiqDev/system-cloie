"use client";

import { Pagination } from "@/components/ui/pagination";
import {
  buildGeneralEducationResponsesUrl,
  type GeneralEducationResponsesFilterState,
} from "@/features/response-review/services/general-education-responses-state";
import { useGeneralEducationResponsesNavigation } from "./general-education-responses-workspace";

export function GeneralEducationResponsesPagination({
  state,
  totalPages,
}: {
  state: GeneralEducationResponsesFilterState;
  totalPages: number;
}) {
  const { navigate } = useGeneralEducationResponsesNavigation();
  return (
    <Pagination
      currentPage={state.page}
      totalPages={totalPages}
      onPageChange={(page) => navigate(buildGeneralEducationResponsesUrl({ ...state, page }))}
    />
  );
}
