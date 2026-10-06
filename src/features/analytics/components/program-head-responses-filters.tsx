"use client";

import {
  RESPONSE_SECTION_OPTIONS,
  RESPONSE_STAKEHOLDER_OPTIONS,
  RESPONSE_YEAR_LEVEL_OPTIONS,
} from "@/features/response-review/components/response-review-labels";
import {
  ResponseComboboxField,
  ResponseSelectField,
  ResponsesFilters,
  type AdvancedResponseFilterField,
  type RawResponseFilters,
} from "@/features/response-review/components/responses-filters";
import type { ResponseFilterOptions } from "@/features/analytics/services/list-program-head-response-deployments";
import type { ProgramHeadResponsesFilterState } from "@/features/analytics/services/program-head-responses-state";
import {
  buildProgramHeadResponsesUrl,
  parseProgramHeadResponsesSearchParams,
} from "@/features/analytics/services/program-head-responses-state";

// ---------------------------------------------------------------------------
// Program Head filter panel (spec §27.2)
//
// Role adapter over the shared panel. The advanced row depends on the view:
// Course-bound evidence filters by class (Course, Faculty, Major, year level,
// section) while Program-wide evidence filters by respondent shape
// (stakeholder, Major, year level, instrument). The view tab is carried as a
// hidden input because it selects the query set rather than a facet of it.
// ---------------------------------------------------------------------------

type Props = {
  programId: string;
  state: ProgramHeadResponsesFilterState;
  options: ResponseFilterOptions;
};

export function ProgramHeadResponsesFilters({ programId, state, options }: Props) {
  const fields = advancedFields(state, options);
  return (
    <ResponsesFilters
      activeCount={countActiveFilters(state)}
      advancedCount={fields.filter((entry) => state[entry.name] !== undefined).length}
      advancedFields={fields}
      primaryFields={(idPrefix) => (
        <ResponseComboboxField
          id={`${idPrefix}-termInstanceId`}
          name="termInstanceId"
          label="Academic period"
          options={options.periodOptions.termInstances}
          value={state.termInstanceId}
          placeholder="All academic periods"
          emptyMessage="No academic periods match your search."
        />
      )}
      status={state.status}
      completion={state.completion}
      searchPlaceholder={
        state.tab === "course" ? "Evaluation, course, or faculty" : "Evaluation or stakeholder"
      }
      description="Search the selected view or narrow it by academic period and response state."
      clearHref={buildProgramHeadResponsesUrl(programId, { tab: state.tab, page: 1 })}
      hiddenFields={carriedScope(state)}
      buildSubmitHref={(raw: RawResponseFilters) => {
        const parsed = parseProgramHeadResponsesSearchParams(raw);
        return buildProgramHeadResponsesUrl(programId, {
          ...parsed,
          tab: state.tab,
          page: 1,
        });
      }}
    />
  );
}

/** Scope with no control on this form: it must survive any other filter. */
function carriedScope(state: ProgramHeadResponsesFilterState) {
  return (
    <>
      {state.schoolYearId ? (
        <input type="hidden" name="schoolYearId" value={state.schoolYearId} />
      ) : null}
      {state.semester ? <input type="hidden" name="semester" value={state.semester} /> : null}
      {state.tab !== "course" ? <input type="hidden" name="tab" value={state.tab} /> : null}
    </>
  );
}

function advancedFields(
  state: ProgramHeadResponsesFilterState,
  options: ResponseFilterOptions
): AdvancedResponseFilterField<ProgramHeadResponsesFilterState>[] {
  if (state.tab === "course") {
    return [
      {
        name: "courseId",
        render: (idPrefix) => (
          <ResponseComboboxField
            id={`${idPrefix}-courseId`}
            name="courseId"
            label="Course"
            options={options.courses}
            value={state.courseId}
            placeholder="All courses"
            emptyMessage="No courses match your search."
          />
        ),
      },
      {
        name: "facultyId",
        render: (idPrefix) => (
          <ResponseComboboxField
            id={`${idPrefix}-facultyId`}
            name="facultyId"
            label="Faculty"
            options={options.faculty}
            value={state.facultyId}
            placeholder="All faculty"
            emptyMessage="No faculty match your search."
          />
        ),
      },
      {
        name: "majorId",
        render: (idPrefix) => (
          <ResponseComboboxField
            id={`${idPrefix}-majorId`}
            name="majorId"
            label="Major"
            options={options.majors}
            value={state.majorId}
            placeholder="All majors"
            emptyMessage="No majors match your search."
          />
        ),
      },
      {
        name: "yearLevel",
        render: (idPrefix) => (
          <ResponseSelectField
            id={`${idPrefix}-yearLevel`}
            name="yearLevel"
            label="Year level"
            options={RESPONSE_YEAR_LEVEL_OPTIONS}
            value={state.yearLevel}
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
            label="Section"
            options={RESPONSE_SECTION_OPTIONS}
            value={state.section}
            blank="All sections"
          />
        ),
      },
    ];
  }

  return [
    {
      name: "stakeholder",
      render: (idPrefix) => (
        <ResponseSelectField
          id={`${idPrefix}-stakeholder`}
          name="stakeholder"
          label="Stakeholder"
          options={RESPONSE_STAKEHOLDER_OPTIONS}
          value={state.stakeholder}
          blank="All stakeholders"
        />
      ),
    },
    {
      name: "majorId",
      render: (idPrefix) => (
        <ResponseComboboxField
          id={`${idPrefix}-majorId`}
          name="majorId"
          label="Major"
          options={options.majors}
          value={state.majorId}
          placeholder="All majors"
          emptyMessage="No majors match your search."
        />
      ),
    },
    {
      name: "yearLevel",
      render: (idPrefix) => (
        <ResponseSelectField
          id={`${idPrefix}-yearLevel`}
          name="yearLevel"
          label="Year level"
          options={RESPONSE_YEAR_LEVEL_OPTIONS}
          value={state.yearLevel}
          blank="All year levels"
        />
      ),
    },
    {
      name: "instrumentTemplateId",
      render: (idPrefix) => (
        <ResponseComboboxField
          id={`${idPrefix}-instrumentTemplateId`}
          name="instrumentTemplateId"
          label="Evaluation instrument"
          options={options.instruments}
          value={state.instrumentTemplateId}
          placeholder="All instruments"
          emptyMessage="No instruments match your search."
        />
      ),
    },
  ];
}

function countActiveFilters(state: ProgramHeadResponsesFilterState): number {
  return [
    state.q,
    state.termInstanceId,
    state.courseId,
    state.facultyId,
    state.majorId,
    state.yearLevel,
    state.section,
    state.stakeholder,
    state.instrumentTemplateId,
    state.status,
    state.completion,
  ].filter(Boolean).length;
}
