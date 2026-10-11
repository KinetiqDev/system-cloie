"use client";

import { FilterableHead } from "@/components/data-table/filterable-head";
import {
  buildGeneralEducationResponsesUrl,
  type GeneralEducationResponsesFilterState,
} from "@/features/response-review/services/general-education-responses-state";
import type { GeneralEducationEvaluationFilterOptions } from "@/features/response-review/services/list-general-education-evaluations";
import {
  buildResponseFacets,
  ResponsesFilters,
  withResponseFacet,
  type ResponseFacetValues,
} from "./responses-filters";
import { useResponsesNavigation } from "./responses-workspace";

// ---------------------------------------------------------------------------
// Coordinator toolbar and evidence column headings (ADR 0034, ADR 0035)
//
// Role adapter over the shared review toolbar: it owns the URL contract and
// nothing else. Every facet writes the current state back with only its own key
// changed, so school year, semester, and ILO scope — which arrive from upward
// navigation and have no control of their own — survive every other change
// instead of silently widening the scope.
//
// The Coordinator has no view tab and no stakeholder dimension: she owns General
// Education Course-bound evidence only. The ILO filter belongs to no column, so
// it opens from the toolbar rather than disappearing.
// ---------------------------------------------------------------------------

type Props = {
  state: GeneralEducationResponsesFilterState;
  options: GeneralEducationEvaluationFilterOptions;
};

/**
 * The Coordinator's facets, each already bound to the canonical URL its change
 * should navigate to. The toolbar and the evidence column headings read the
 * same set, so a funnel can never offer a choice the toolbar would not.
 */
function useGeneralEducationFacets(
  state: GeneralEducationResponsesFilterState,
  options: GeneralEducationEvaluationFilterOptions
) {
  const { navigate } = useResponsesNavigation();

  return buildResponseFacets(
    "coordinator",
    state as ResponseFacetValues,
    (key, value) => navigate(facetHref(state, key, value)),
    {
      termInstances: options.periodOptions.termInstances,
      courses: options.courses,
      faculty: options.faculty,
      programs: options.programs,
      ilos: options.ilos,
      majors: [],
      instruments: [],
    }
  );
}

export function GeneralEducationResponsesFilters({ state, options }: Props) {
  const { navigate } = useResponsesNavigation();
  const facets = useGeneralEducationFacets(state, options);

  return (
    <ResponsesFilters
      facets={facets.all}
      overflowFacets={facets.overflow}
      search={{
        id: "gen-ed-responses-search",
        label: "Search evaluations",
        placeholder: "Evaluation, course, or faculty",
        value: state.q,
        onChange: (value) =>
          navigate(buildGeneralEducationResponsesUrl({ ...state, page: 1, q: value || undefined })),
      }}
      onClearAll={() => navigate(buildGeneralEducationResponsesUrl({ page: 1 }))}
    />
  );
}

/**
 * The evidence table's filterable headings, one funnel per column. Renders
 * inside the table's own `TableHeader`, so each funnel hangs off the column it
 * narrows. The Class column carries three facts — year level, section, and the
 * assignment's Program — so it opens all three under one heading.
 */
export function GeneralEducationResponsesTableHead({ state, options }: Props) {
  const facets = useGeneralEducationFacets(state, options).byColumn;

  return (
    <>
      {/* These widths plus the trailing Mean column (10%) are a percentage
          budget that must total 100: 28+15+13+12+11+11+10. The budget leaves
          room for each label AND its funnel while reallocating excess
          whitespace to the Evaluation title column. */}
      <FilterableHead label="Evaluation" facets={facets.evaluation} className="w-[28%]" />
      <FilterableHead label="Class" facets={facets.class} className="w-[15%]" />
      <FilterableHead label="Faculty" facets={facets.faculty} className="w-[13%]" />
      <FilterableHead label="Period" facets={facets.period} className="w-[12%]" />
      <FilterableHead label="Status" facets={facets.status} className="w-[11%]" />
      <FilterableHead label="Submitted" facets={facets.submitted} className="w-[11%]" />
    </>
  );
}

/**
 * The canonical href one facet change lands on: the committed state with only
 * that key overridden and the page reset to the first.
 */
function facetHref(
  state: GeneralEducationResponsesFilterState,
  key: string,
  value: string | null
): string {
  return buildGeneralEducationResponsesUrl(
    withResponseFacet(state, key, value) as Partial<GeneralEducationResponsesFilterState>
  );
}
