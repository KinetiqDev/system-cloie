"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { MobileFilterSheet, TableToolbar } from "@/components/data-table/table-toolbar";
import { FacetPopoverBody } from "@/components/data-table/column-filter";
import { facetIsApplied, facetValueLabel, type FacetDef } from "@/components/data-table/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import {
  RESPONSE_SECTION_OPTIONS,
  RESPONSE_STAKEHOLDER_OPTIONS,
  RESPONSE_STATUS_OPTIONS,
  RESPONSE_YEAR_LEVEL_OPTIONS,
  type ResponseFilterOption,
} from "./response-review-labels";

// ---------------------------------------------------------------------------
// Shared response-review narrowing (spec §25.2, §27.2)
//
// Program Heads and the General Education Coordinator review the same kind of
// evaluation roster, so they narrow it the same way: every facet applies the
// moment it changes, and it hangs off the column it narrows. This module owns
// that vocabulary — which facet belongs to which column, and what it is called
// — while the role adapter owns URL parsing, serialization, and its canonical
// href. Nothing here collects a form value or waits for a submit.
//
// Search is deliberately not a facet: it spans columns, so it belongs to the
// toolbar. A facet no column can own stays reachable through the toolbar's own
// popover rather than disappearing.
// ---------------------------------------------------------------------------

/** Columns the evaluation-evidence table can narrow through its own heading. */
type ResponseFacetColumn =
  | "evaluation"
  | "class"
  | "faculty"
  | "target"
  | "stakeholder"
  | "period"
  | "status"
  | "submitted";

/**
 * Which evidence a view shows. Program Heads switch between Course-bound and
 * Program-wide evidence; the Coordinator has the single Course-bound view.
 */
export type ResponseFacetView = "course" | "program-wide" | "coordinator";

/** The facets a role state can carry, in URL-key form. */
export type ResponseFacetValues = {
  courseId?: string;
  facultyId?: string;
  majorId?: string;
  yearLevel?: string;
  section?: string;
  stakeholder?: string;
  termInstanceId?: string;
  status?: string;
  completion?: string;
  instrumentTemplateId?: string;
  programId?: string;
  iloId?: string;
};

type FacetChoice = { id: string; label: string };

type ResponseFacetOptions = {
  termInstances: readonly FacetChoice[];
  courses: readonly FacetChoice[];
  faculty: readonly FacetChoice[];
  majors: readonly FacetChoice[];
  instruments: readonly FacetChoice[];
  /** Class-context Programs; the Coordinator view only. */
  programs?: readonly FacetChoice[];
  ilos?: readonly FacetChoice[];
};

/** Writes one URL key. A null value clears the facet. */
type ResponseFacetUpdate = (key: string, value: string | null) => void;

type ResponseFacetColumns = Partial<Record<ResponseFacetColumn, FacetDef[]>>;

export type ResponseFacets = {
  /** Facets grouped by the column heading they hang off. */
  byColumn: ResponseFacetColumns;
  /** Facets no column owns; the toolbar offers them in one popover. */
  overflow: FacetDef[];
  /** Every facet, so applied ones can show as removable chips. */
  all: FacetDef[];
};

/**
 * Response progress against the evaluation's real assignment opportunities.
 * The wording names the count rather than a stage, because the filter compares
 * "none / some / every" — "In progress" would read as a single mid-state.
 */
const RESPONSE_COMPLETION_FACETS: ResponseFilterOption[] = [
  { id: "zero", label: "None submitted" },
  { id: "partial", label: "Partly submitted" },
  { id: "complete", label: "Fully submitted" },
];

function optionList(
  choices: readonly FacetChoice[] | undefined,
  searchPlaceholder: string,
  emptyMessage: string
) {
  return {
    options: (choices ?? []).map((choice) => ({ id: choice.id, label: choice.label })),
    searchable: true,
    searchPlaceholder,
    emptyMessage,
  };
}
function columnsForView(
  view: ResponseFacetView,
  facets: Record<
    | "course"
    | "faculty"
    | "major"
    | "instrument"
    | "classProgram"
    | "ilo"
    | "yearLevel"
    | "section"
    | "stakeholder"
    | "period"
    | "status"
    | "submitted",
    FacetDef
  >
): ResponseFacetColumns {
  if (view === "program-wide") {
    return {
      stakeholder: [facets.stakeholder],
      // Target is the joined major · year level, so both facts narrow it.
      target: [facets.major, facets.yearLevel],
      period: [facets.period],
      status: [facets.status],
      submitted: [facets.submitted],
    };
  }
  if (view === "coordinator") {
    return {
      evaluation: [facets.course],
      class: [facets.yearLevel, facets.section, facets.classProgram],
      faculty: [facets.faculty],
      period: [facets.period],
      status: [facets.status],
      submitted: [facets.submitted],
    };
  }
  return {
    evaluation: [facets.course],
    class: [facets.yearLevel, facets.section],
    faculty: [facets.faculty],
    period: [facets.period],
    status: [facets.status],
    submitted: [facets.submitted],
  };
}

function optionFacet(
  id: string,
  label: string,
  value: string | null | undefined,
  key: string,
  update: ResponseFacetUpdate,
  allLabel: string,
  choices: readonly FacetChoice[] | undefined,
  searchPlaceholder: string,
  emptyMessage: string
): FacetDef {
  return {
    id,
    label,
    value: value ?? null,
    onChange: (next) => update(key, next),
    allLabel,
    ...optionList(choices, searchPlaceholder, emptyMessage),
  };
}

export function buildResponseFacets(
  view: ResponseFacetView,
  values: ResponseFacetValues,
  update: ResponseFacetUpdate,
  options: ResponseFacetOptions
): ResponseFacets {
  const course: FacetDef = optionFacet(
    "courseId",
    "Course",
    values.courseId,
    "courseId",
    update,
    "All courses",
    options.courses,
    "Search courses…",
    "No courses match your search."
  );

  const faculty: FacetDef = optionFacet(
    "facultyId",
    "Faculty",
    values.facultyId,
    "facultyId",
    update,
    "All faculty",
    options.faculty,
    "Search faculty…",
    "No faculty match your search."
  );

  const major: FacetDef = optionFacet(
    "majorId",
    "Major",
    values.majorId,
    "majorId",
    update,
    "All majors",
    options.majors,
    "Search majors…",
    "No majors match your search."
  );

  const instrument: FacetDef = optionFacet(
    "instrumentTemplateId",
    "Evaluation instrument",
    values.instrumentTemplateId,
    "instrumentTemplateId",
    update,
    "All instruments",
    options.instruments,
    "Search instruments…",
    "No instruments match your search."
  );

  // ADR 0035: this Program is the class the evaluation was assigned to, never
  // the respondent's, so the label says so wherever the control appears.
  const classProgram: FacetDef = optionFacet(
    "programId",
    "Class program",
    values.programId,
    "programId",
    update,
    "All class programs",
    options.programs,
    "Search programs…",
    "No class programs match your search."
  );

  const ilo: FacetDef = optionFacet(
    "iloId",
    "Institutional Learning Outcome",
    values.iloId,
    "iloId",
    update,
    "All institutional outcomes",
    options.ilos,
    "Search outcomes…",
    "No institutional outcomes match your search."
  );

  const yearLevel: FacetDef = {
    id: "yearLevel",
    label: "Year level",
    value: values.yearLevel ?? null,
    onChange: (value) => update("yearLevel", value),
    allLabel: "All year levels",
    options: RESPONSE_YEAR_LEVEL_OPTIONS,
  };

  const section: FacetDef = {
    id: "section",
    label: "Section",
    value: values.section ?? null,
    onChange: (value) => update("section", value),
    allLabel: "All sections",
    options: RESPONSE_SECTION_OPTIONS,
  };

  const stakeholder: FacetDef = {
    id: "stakeholder",
    label: "Stakeholder",
    value: values.stakeholder ?? null,
    onChange: (value) => update("stakeholder", value),
    allLabel: "All stakeholders",
    options: RESPONSE_STAKEHOLDER_OPTIONS,
  };

  const period: FacetDef = optionFacet(
    "termInstanceId",
    "Academic period",
    values.termInstanceId,
    "termInstanceId",
    update,
    "All academic periods",
    options.termInstances,
    "Search academic periods…",
    "No academic periods match your search."
  );

  const status: FacetDef = {
    id: "status",
    label: "Status",
    value: values.status ?? null,
    onChange: (value) => update("status", value),
    allLabel: "All statuses",
    options: RESPONSE_STATUS_OPTIONS,
  };
  const submitted: FacetDef = {
    id: "completion",
    label: "Submitted",
    value: values.completion ?? null,
    onChange: (value) => update("completion", value),
    allLabel: "All response counts",
    options: RESPONSE_COMPLETION_FACETS,
  };

  const byColumn = columnsForView(view, {
    course,
    faculty,
    major,
    instrument,
    classProgram,
    ilo,
    yearLevel,
    section,
    stakeholder,
    period,
    status,
    submitted,
  });
  // Course-bound evidence has no Major column and the Coordinator has no
  // instrument column, so those facets stay reachable from the toolbar.
  const overflow = view === "course" ? [major] : view === "program-wide" ? [instrument] : [ilo];

  return { byColumn, overflow, all: [...Object.values(byColumn).flat(), ...overflow] };
}

/**
 * The next state after one facet changes: start from the committed state so
 * scope that has no control here survives, override only the changed key, and
 * return to the first page because the current one may no longer exist.
 */
export function withResponseFacet<State extends object>(
  state: State,
  key: string,
  value: string | null
): State & { page: number } {
  const next = { ...state, page: 1 } as Record<string, unknown>;
  if (value === null) delete next[key];
  else next[key] = value;
  return next as State & { page: number };
}
/**
 * The next state after one column's popover clear: start from the committed
 * state and drop every key the column owns, so a column carrying several
 * facets navigates once instead of once per facet from the same stale
 */
export function withoutResponseFacets<State extends object>(
  state: State,
  keys: readonly string[]
): State & { page: number } {
  const next = { ...state, page: 1 } as Record<string, unknown>;
  for (const key of keys) delete next[key];
  return next as State & { page: number };
}
/** Debounce window for the toolbar's cross-column search. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The toolbar search's draft, committed on a debounce so typing does not write
 * a history entry per keystroke.
 *
 * A query that arrives from elsewhere (deep link, back/forward) replaces the
 * draft, but never one the operator is still typing into: while the field has
 * focus its text is theirs, and the incoming query waits for blur.
 */
function useResponseSearchDraft(committed: string | undefined, onCommit: (value: string) => void) {
  const committedText = committed ?? "";
  const [draft, setDraft] = useState(committedText);
  const [shownCommit, setShownCommit] = useState(committedText);
  const [focused, setFocused] = useState(false);
  const timer = useRef<number | null>(null);
  const latestCommit = useRef(onCommit);

  useEffect(() => {
    latestCommit.current = onCommit;
  });

  // Adjusting state during render is React's own answer for "the committed
  // query changed while the field had focus": it re-renders before the DOM is
  // touched, with no effect, no ref read, and no cascading pass.
  if (shownCommit !== committedText) {
    setShownCommit(committedText);
    if (!focused) setDraft(committedText);
  }

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );

  const onChange = useCallback((value: string) => {
    setDraft(value);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      latestCommit.current(value);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  return {
    value: draft,
    onChange,
    onFocus: useCallback(() => setFocused(true), []),
    onBlur: useCallback(() => setFocused(false), []),
  };
}

/**
 * The shared review toolbar: the one line above the evidence that holds the
 * search spanning several columns, a removable chip per applied facet, the
 * facets no column owns, and the mobile sheet that stands in for the heading
 * row once the table collapses to cards.
 */
export function ResponsesFilters({
  facets,
  overflowFacets,
  search,
  onClearAll,
}: {
  /** Every facet this list offers, so applied ones show as removable chips. */
  facets: FacetDef[];
  /** Facets with no column of their own, opened from the toolbar itself. */
  overflowFacets?: FacetDef[];
  search: {
    id: string;
    label: string;
    placeholder: string;
    /** Query committed to the URL, or undefined when nothing is in force. */
    value?: string;
    onChange: (value: string) => void;
  };
  onClearAll: () => void;
}) {
  const draft = useResponseSearchDraft(search.value, search.onChange);
  const activeCount = facets.filter(facetIsApplied).length;

  return (
    <TableToolbar
      search={{
        id: search.id,
        label: search.label,
        placeholder: search.placeholder,
        value: draft.value,
        onChange: draft.onChange,
        onFocus: draft.onFocus,
        onBlur: draft.onBlur,
      }}
      facets={facets}
      onClearAll={onClearAll}
    >
      {overflowFacets && overflowFacets.length > 0 ? (
        <ResponseFacetMenu facets={overflowFacets} />
      ) : null}
      <div className="lg:hidden">
        <MobileFilterSheet
          facets={facets}
          activeCount={activeCount}
          onClearAll={onClearAll}
          summary="Show results"
        />
      </div>
    </TableToolbar>
  );
}

/**
 * The toolbar's home for the facets no column owns. It is the same control the
 * heading funnels use, so a facet that has no column of its own is still
 * reachable instead of silently dropped from the list.
 */
function ResponseFacetMenu({ facets }: { facets: FacetDef[] }) {
  const active = facets.filter(facetIsApplied);
  const summary = active.map(facetValueLabel).join(", ");

  return (
    <Popover>
      <PopoverTrigger
        openOnHover={false}
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`More filters${active.length > 0 ? `: ${summary}` : ""}`}
            className="shrink-0"
          />
        }
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        More filters
      </PopoverTrigger>
      <FacetPopoverBody heading="More filters" facets={facets} />
    </Popover>
  );
}
