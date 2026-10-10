"use client";

import { FilterableHead } from "@/components/data-table/filterable-head";
import type { ResponseFilterOptions } from "@/features/analytics/services/list-program-head-response-deployments";
import {
  buildProgramHeadResponsesUrl,
  type ProgramHeadResponsesFilterState,
} from "@/features/analytics/services/program-head-responses-state";
import {
  buildResponseFacets,
  ResponsesFilters,
  withResponseFacet,
  type ResponseFacetValues,
  type ResponseFacetView,
  type ResponseFacets,
} from "@/features/response-review/components/responses-filters";
import { useResponsesNavigation } from "@/features/response-review/components/responses-workspace";

// ---------------------------------------------------------------------------
// Program Head toolbar and evidence column headings (spec §27.2)
//
// Role adapter over the shared review toolbar. Which facets exist depends on
// the view: Course-bound evidence narrows by Course, class, Faculty, Major,
// year level, and section; Program-wide evidence narrows by respondent shape —
// stakeholder, Major, year level, and instrument. Major has no column of its own
// on Course-bound evidence and the instrument has none on Program-wide, so each
// becomes a toolbar popover rather than a dropped control.
//
// School year, semester, and the view tab carry no control here, so every facet
// change writes back the committed state with only its own key overridden.
// ---------------------------------------------------------------------------

type Props = {
  programId: string;
  state: ProgramHeadResponsesFilterState;
  options: ResponseFilterOptions;
};

/**
 * The facets this view offers, each already bound to the canonical URL its
 * change should navigate to. The toolbar and the evidence column headings read
 * the same set, so a funnel can never offer a choice the toolbar would not.
 */
function useProgramHeadFacets(
  programId: string,
  state: ProgramHeadResponsesFilterState,
  options: ResponseFilterOptions
): ResponseFacets {
  const { navigate } = useResponsesNavigation();
  const view: ResponseFacetView = state.tab;

  return buildResponseFacets(
    view,
    state as unknown as ResponseFacetValues,
    (key, value) => navigate(facetHref(programId, state, key, value)),
    {
      termInstances: options.periodOptions.termInstances,
      courses: options.courses,
      faculty: options.faculty,
      majors: options.majors,
      instruments: options.instruments,
    }
  );
}

export function ProgramHeadResponsesFilters({ programId, state, options }: Props) {
  const { navigate } = useResponsesNavigation();
  const facets = useProgramHeadFacets(programId, state, options);

  return (
    <ResponsesFilters
      facets={facets.all}
      overflowFacets={facets.overflow}
      search={{
        id: "program-head-responses-search",
        label: "Search evaluations",
        placeholder:
          state.tab === "course" ? "Evaluation, course, or faculty" : "Evaluation or stakeholder",
        value: state.q,
        onChange: (value) =>
          navigate(
            buildProgramHeadResponsesUrl(programId, { ...state, page: 1, q: value || undefined })
          ),
      }}
      onClearAll={() =>
        navigate(buildProgramHeadResponsesUrl(programId, { tab: state.tab, page: 1 }))
      }
    />
  );
}

/**
 * The evidence table's filterable headings, one funnel per column. Renders
 * inside the table's own `TableHeader`, so each funnel hangs off the column it
 * narrows. The width classes are the fixed-layout column widths, rebalanced so
 * a heading and its funnel both fit the narrow numeric columns.
 */
export function ProgramHeadResponsesTableHead({
  programId,
  state,
  options,
  isCourse,
}: Props & { isCourse: boolean }) {
  const facets = useProgramHeadFacets(programId, state, options).byColumn;

  return (
    <>
      {/* Widths leave room for the label AND its funnel: dashboard layout is
          length-critical, but a label that cannot fit is worse than a slightly
          narrower reading column. */}
      <FilterableHead
        label="Evaluation"
        facets={facets.evaluation}
        className={isCourse ? "w-[20%]" : "w-[17%]"}
      />
      {/* "Stakeholder" is eleven characters to "Class"'s five, so the
          program-wide tab's own label decides the column's width. */}
      <FilterableHead
        label={isCourse ? "Class" : "Stakeholder"}
        facets={facets.class ?? facets.stakeholder}
        className={isCourse ? "w-[15%]" : "w-[20%]"}
      />
      <FilterableHead
        label={isCourse ? "Faculty" : "Target"}
        facets={facets.faculty ?? facets.target}
        className="w-[13%]"
      />
      <FilterableHead label="Period" facets={facets.period} className="w-[13%]" />
      <FilterableHead label="Status" facets={facets.status} className="w-[11%]" />
      {/* The funnel is pushed to the far edge of the cell, matching the numbers
          below it, so a right-aligned column stays a single visual block. */}
      <FilterableHead
        label="Submitted"
        facets={facets.submitted}
        className="w-[14%] text-right [&>span]:justify-end"
      />
    </>
  );
}

/**
 * The canonical href one facet change lands on: the committed state with only
 * that key overridden and the page reset to the first. The tab is written
 * explicitly, so a facet can never move the reader between the two views.
 */
function facetHref(
  programId: string,
  state: ProgramHeadResponsesFilterState,
  key: string,
  value: string | null
): string {
  return buildProgramHeadResponsesUrl(programId, {
    ...(withResponseFacet(state, key, value) as ProgramHeadResponsesFilterState),
    tab: state.tab,
    page: 1,
  });
}
