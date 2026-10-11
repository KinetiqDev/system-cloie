import { describe, expect, it, vi } from "vitest";

import { facetIsApplied } from "@/components/data-table/types";
import {
  buildResponseFacets,
  withResponseFacet,
  type ResponseFacets,
  type ResponseFacetValues,
} from "@/features/response-review/components/responses-filters";
import type { GeneralEducationResponsesFilterState } from "@/features/response-review/services/general-education-responses-state";
import type { ProgramHeadResponsesFilterState } from "@/features/analytics/services/program-head-responses-state";

// ---------------------------------------------------------------------------
// The facet vocabulary both review roles read from. Narrowing applies the
// moment a facet changes, so the state each change produces is the whole
// contract: scope with no visible control must survive, and the page must reset
// because the current one may no longer exist.
// ---------------------------------------------------------------------------

const UUID = {
  course: "22222222-2222-4222-8222-222222222222",
  major: "44444444-4444-4444-8444-444444444444",
  instrument: "55555555-5555-4555-8555-555555555555",
  program: "77777777-7777-4777-8777-777777777777",
  ilo: "88888888-8888-4888-8888-888888888888",
  term: "99999999-9999-4999-8999-999999999999",
};

const choices = {
  termInstances: [{ id: UUID.term, label: "2025-2026 · 2nd Semester" }],
  courses: [{ id: UUID.course, label: "GE 1 · Understanding the Self" }],
  faculty: [{ id: "faculty-1", label: "Dr. Santos" }],
  majors: [{ id: UUID.major, label: "Elementary Education" }],
  instruments: [{ id: UUID.instrument, label: "Program Exit Survey" }],
};

/** The column heading a facet hangs off, or undefined when no column owns it. */
const columnOf = (facets: ResponseFacets, id: string) =>
  Object.entries(facets.byColumn).find(([, list]) => list?.some((facet) => facet.id === id))?.[0];

describe("withResponseFacet", () => {
  it("overrides only the changed key and returns to the first page", () => {
    const state: GeneralEducationResponsesFilterState = {
      page: 4,
      q: "clarity",
      courseId: UUID.course,
      status: "ACTIVE",
    };

    expect(withResponseFacet(state, "status", "CLOSED")).toEqual({
      page: 1,
      q: "clarity",
      courseId: UUID.course,
      status: "CLOSED",
    });
  });

  it("keeps scope that has no visible control rather than widening it", () => {
    // School year, semester, and the view tab carry no control on the review
    // surface; dropping one would silently widen the evidence being read.
    const state: ProgramHeadResponsesFilterState = {
      tab: "program-wide",
      page: 3,
      schoolYearId: "school-year-1",
      semester: "SECOND",
      stakeholder: "STUDENT",
    };

    expect(withResponseFacet(state, "majorId", UUID.major)).toMatchObject({
      tab: "program-wide",
      page: 1,
      schoolYearId: "school-year-1",
      semester: "SECOND",
      stakeholder: "STUDENT",
      majorId: UUID.major,
    });
  });

  it("removes the key entirely when the facet is cleared", () => {
    const state: GeneralEducationResponsesFilterState = { page: 1, iloId: UUID.ilo };

    const next = withResponseFacet(state, "iloId", null);

    expect("iloId" in next).toBe(false);
    expect(next).toEqual({ page: 1 });
  });

  it("does not mutate the committed state it starts from", () => {
    const state = { page: 3, courseId: UUID.course };

    withResponseFacet(state, "courseId", null);

    expect(state).toEqual({ page: 3, courseId: UUID.course });
  });
});

describe("buildResponseFacets", () => {
  it("hangs each Course-bound facet on the column that shows it", () => {
    const facets = buildResponseFacets("course", {} as ResponseFacetValues, () => {}, choices);

    expect(columnOf(facets, "courseId")).toBe("evaluation");
    expect(columnOf(facets, "facultyId")).toBe("faculty");
    expect(columnOf(facets, "yearLevel")).toBe("class");
    expect(columnOf(facets, "section")).toBe("class");
    expect(columnOf(facets, "termInstanceId")).toBe("period");
    expect(columnOf(facets, "status")).toBe("status");
    expect(columnOf(facets, "completion")).toBe("submitted");
    // Course-bound evidence has no Major column of its own.
    expect(columnOf(facets, "majorId")).toBeUndefined();
    expect(facets.overflow.map((facet) => facet.id)).toEqual(["majorId"]);
  });

  it("hangs both Program-wide facts on the joined Target column", () => {
    const facets = buildResponseFacets(
      "program-wide",
      {} as ResponseFacetValues,
      () => {},
      choices
    );

    expect(columnOf(facets, "stakeholder")).toBe("stakeholder");
    expect(columnOf(facets, "majorId")).toBe("target");
    expect(columnOf(facets, "yearLevel")).toBe("target");
    // Program-wide evidence has no instrument column of its own.
    expect(columnOf(facets, "instrumentTemplateId")).toBeUndefined();
    expect(facets.overflow.map((facet) => facet.id)).toEqual(["instrumentTemplateId"]);
  });

  it("never offers a Course-bound facet on Program-wide evidence", () => {
    const facets = buildResponseFacets(
      "program-wide",
      { courseId: UUID.course, facultyId: "faculty-1", section: "MORNING" } as ResponseFacetValues,
      () => {},
      choices
    );

    expect(columnOf(facets, "courseId")).toBeUndefined();
    expect(columnOf(facets, "facultyId")).toBeUndefined();
    expect(columnOf(facets, "section")).toBeUndefined();
  });

  it("keeps the Coordinator's class Program labelled as class context, not ownership", () => {
    // ADR 0035: `programId` is the assignment's Program, never the respondent's.
    const facets = buildResponseFacets(
      "coordinator",
      { programId: UUID.program } as ResponseFacetValues,
      () => {},
      {
        ...choices,
        programs: [{ id: UUID.program, label: "BSIT · Information Technology" }],
        ilos: [],
      }
    );

    const classProgram = facets.byColumn.class?.find((facet) => facet.id === "programId");
    expect(classProgram?.label).toBe("Class program");
    expect(classProgram?.value).toBe(UUID.program);
    expect(facets.overflow.map((facet) => facet.id)).toEqual(["iloId"]);
  });

  it("reads the submitted facet as a count, not a lifecycle stage", () => {
    const facets = buildResponseFacets("course", {} as ResponseFacetValues, () => {}, choices);

    // The filter compares none / some / every against real assignment
    // opportunities, so the options name the count rather than a stage.
    const options = facets.byColumn.submitted?.flatMap((facet) =>
      facet.kind === "toggle" ? [] : facet.options
    );
    expect(options).toMatchObject([
      { id: "zero", label: "None submitted" },
      { id: "partial", label: "Partly submitted" },
      { id: "complete", label: "Fully submitted" },
    ]);
  });

  it("offers exactly one choice at a time and applies on change", () => {
    const update = vi.fn();
    const facets = buildResponseFacets(
      "course",
      { status: "ACTIVE" } as ResponseFacetValues,
      update,
      choices
    );
    const status = facets.byColumn.status?.[0];
    // Every review facet is single-choice; the radio group is the whole control.
    if (!status || status.kind === "toggle") throw new Error("Status is an option facet.");
    expect(status.options.map((option) => option.id)).toEqual([
      "SCHEDULED",
      "ACTIVE",
      "CLOSED",
      "ARCHIVED",
    ]);
    status.onChange("CLOSED");
    expect(update).toHaveBeenCalledWith("status", "CLOSED");
    status.onChange(null);
    expect(update).toHaveBeenCalledWith("status", null);
  });

  it("shows an applied facet as a chip and an unset one as nothing", () => {
    const facets = buildResponseFacets(
      "course",
      { termInstanceId: UUID.term } as ResponseFacetValues,
      () => {},
      choices
    );

    expect(facetIsApplied(facets.byColumn.period![0])).toBe(true);
    expect(facetIsApplied(facets.byColumn.class![0])).toBe(false);
  });

  it("collects every facet once, so chips and controls cannot drift", () => {
    const facets = buildResponseFacets("coordinator", {} as ResponseFacetValues, () => {}, {
      ...choices,
      programs: [],
      ilos: [],
    });

    const ids = facets.all.map((facet) => facet.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("iloId");
  });
});
