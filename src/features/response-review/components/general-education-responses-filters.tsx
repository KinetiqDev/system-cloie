"use client";

import {
  RESPONSE_SECTION_OPTIONS,
  RESPONSE_YEAR_LEVEL_OPTIONS,
} from "@/features/response-review/components/response-review-labels";
import type { GeneralEducationEvaluationFilterOptions } from "@/features/response-review/services/list-general-education-evaluations";
import {
  buildGeneralEducationResponsesUrl,
  parseGeneralEducationResponsesSearchParams,
  type GeneralEducationResponsesFilterState,
} from "@/features/response-review/services/general-education-responses-state";
import {
  ResponseComboboxField,
  ResponseSelectField,
  ResponsesFilters,
  type AdvancedResponseFilterField,
  type RawResponseFilters,
} from "./responses-filters";

// ---------------------------------------------------------------------------
// Coordinator filter panel (ADR 0034, ADR 0035)
//
// Role adapter over the shared panel: the primary row is search, academic
// period, status, and response progress. The advanced row is the class
// context — Course, Program, ILO, Faculty, year level, section. There is no
// view tab and no stakeholder dimension because the Coordinator owns General
// Education Course-bound evidence only.
// ---------------------------------------------------------------------------

type Props = {
  state: GeneralEducationResponsesFilterState;
  options: GeneralEducationEvaluationFilterOptions;
};

export function GeneralEducationResponsesFilters({ state, options }: Props) {
  const fields = advancedFields(options, state);
  return (
    <ResponsesFilters
      activeCount={countActiveFilters(state)}
      advancedCount={fields.filter((entry) => state[entry.name] !== undefined).length}
      advancedFields={fields}
      primaryFields={(idPrefix) => periodField(options, state, idPrefix)}
      status={state.status}
      completion={state.completion}
      searchPlaceholder="Evaluation, course, or faculty"
      description="Search General Education evaluations or narrow them by academic period and response state."
      clearHref={buildGeneralEducationResponsesUrl({ page: 1 })}
      hiddenFields={carriedScope(state)}
      buildSubmitHref={(raw: RawResponseFilters) => {
        const parsed = parseGeneralEducationResponsesSearchParams(raw);
        return buildGeneralEducationResponsesUrl({ ...parsed, page: 1 });
      }}
    />
  );
}

/**
 * School year, semester, and ILO scope arrive on the URL from upward
 * navigation and have no visible control here. The form must carry them
 * forward or applying any other filter would silently widen the scope.
 */
function carriedScope(state: GeneralEducationResponsesFilterState) {
  return (
    <>
      {state.schoolYearId ? (
        <input type="hidden" name="schoolYearId" value={state.schoolYearId} />
      ) : null}
      {state.semester ? <input type="hidden" name="semester" value={state.semester} /> : null}
    </>
  );
}

function periodField(
  options: GeneralEducationEvaluationFilterOptions,
  state: GeneralEducationResponsesFilterState,
  idPrefix: string
) {
  return (
    <ResponseComboboxField
      id={`${idPrefix}-termInstanceId`}
      name="termInstanceId"
      label="Academic period"
      options={options.periodOptions.termInstances}
      value={state.termInstanceId}
      placeholder="All academic periods"
      emptyMessage="No academic periods match your search."
    />
  );
}

function advancedFields(
  options: GeneralEducationEvaluationFilterOptions,
  state: GeneralEducationResponsesFilterState
): AdvancedResponseFilterField<GeneralEducationResponsesFilterState>[] {
  return [
    {
      name: "courseId",
      render: (idPrefix) => (
        <ResponseComboboxField
          id={`${idPrefix}-courseId`}
          name="courseId"
          value={state.courseId}
          label="Course"
          options={options.courses}
          placeholder="All courses"
          emptyMessage="No courses match your search."
        />
      ),
    },
    {
      name: "programId",
      render: (idPrefix) => (
        <ResponseComboboxField
          id={`${idPrefix}-programId`}
          name="programId"
          value={state.programId}
          label="Class program"
          options={options.programs}
          placeholder="All class programs"
          emptyMessage="No class programs match your search."
        />
      ),
    },
    {
      name: "iloId",
      render: (idPrefix) => (
        <ResponseComboboxField
          id={`${idPrefix}-iloId`}
          name="iloId"
          value={state.iloId}
          label="Institutional Learning Outcome"
          options={options.ilos}
          placeholder="All institutional outcomes"
          emptyMessage="No institutional outcomes match your search."
        />
      ),
    },
    {
      name: "facultyId",
      render: (idPrefix) => (
        <ResponseComboboxField
          id={`${idPrefix}-facultyId`}
          name="facultyId"
          value={state.facultyId}
          label="Faculty"
          options={options.faculty}
          placeholder="All faculty"
          emptyMessage="No faculty match your search."
        />
      ),
    },
    {
      name: "yearLevel",
      render: (idPrefix) => (
        <ResponseSelectField
          id={`${idPrefix}-yearLevel`}
          name="yearLevel"
          value={state.yearLevel}
          label="Year level"
          options={RESPONSE_YEAR_LEVEL_OPTIONS}
          blank="All year levels"
        />
      ),
    },
    {
      name: "section",
      render: (idPrefix) => (
        <ResponseSelectField
          id={`${idPrefix}-section`}
          name="section"
          value={state.section}
          label="Section"
          options={RESPONSE_SECTION_OPTIONS}
          blank="All sections"
        />
      ),
    },
  ];
}

function countActiveFilters(state: GeneralEducationResponsesFilterState): number {
  return [
    state.q,
    state.termInstanceId,
    state.schoolYearId,
    state.semester,
    state.courseId,
    state.programId,
    state.facultyId,
    state.yearLevel,
    state.section,
    state.iloId,
    state.status,
    state.completion,
  ].filter(Boolean).length;
}
