"use client";

import {
  buildGeneralEducationResponsesUrl,
  type GeneralEducationResponsesFilterState,
} from "../services/general-education-responses-state";
import { ResponsesPagination } from "./responses-pagination";

export function GeneralEducationResponsesPagination({
  state,
  totalPages,
}: {
  state: GeneralEducationResponsesFilterState;
  totalPages: number;
}) {
  return (
    <ResponsesPagination
      page={state.page}
      totalPages={totalPages}
      buildPageUrl={(page) => buildGeneralEducationResponsesUrl({ ...state, page })}
    />
  );
}
