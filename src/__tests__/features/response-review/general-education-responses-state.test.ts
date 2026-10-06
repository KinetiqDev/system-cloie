import { describe, expect, it } from "vitest";

import {
  buildGeneralEducationResponsesUrl,
  generalEducationResponsesQuery,
  parseGeneralEducationResponsesSearchParams,
} from "@/features/response-review/services/general-education-responses-state";

// ---------------------------------------------------------------------------
// ADR 0035: the Coordinator review list carries the Program Head review facets
// plus class-context Program and ILO. Course scope — never the respondent's
// Program — keeps ownership, and the URL must round-trip every facet so an
// applied filter is never silently widened by a later navigation.
// ---------------------------------------------------------------------------

const UUID = {
  term: "11111111-1111-4111-8111-111111111111",
  schoolYear: "22222222-2222-4222-8222-222222222222",
  course: "33333333-3333-4333-8333-333333333333",
  program: "44444444-4444-4444-8444-444444444444",
  faculty: "55555555-5555-4555-8555-555555555555",
  ilo: "66666666-6666-4666-8666-666666666666",
};

describe("general education responses filter state", () => {
  it("round-trips every review facet through the URL", () => {
    const state = parseGeneralEducationResponsesSearchParams({
      page: "2",
      q: "ethics",
      termInstanceId: UUID.term,
      courseId: UUID.course,
      programId: UUID.program,
      facultyId: UUID.faculty,
      yearLevel: "THIRD_YEAR",
      section: "MORNING",
      iloId: UUID.ilo,
      status: "CLOSED",
      completion: "complete",
    });

    expect(state).toEqual({
      page: 2,
      q: "ethics",
      termInstanceId: UUID.term,
      courseId: UUID.course,
      programId: UUID.program,
      facultyId: UUID.faculty,
      yearLevel: "THIRD_YEAR",
      section: "MORNING",
      iloId: UUID.ilo,
      status: "CLOSED",
      completion: "complete",
    });

    const url = buildGeneralEducationResponsesUrl(state);
    expect(Object.fromEntries(new URL(url, "https://x.test").searchParams)).toEqual({
      page: "2",
      q: "ethics",
      termInstanceId: UUID.term,
      courseId: UUID.course,
      programId: UUID.program,
      facultyId: UUID.faculty,
      yearLevel: "THIRD_YEAR",
      section: "MORNING",
      iloId: UUID.ilo,
      status: "CLOSED",
      completion: "complete",
    });
  });

  it("keeps the class-context Program distinct from evidence ownership", () => {
    // `programId` filters the assignment's class context only. It must not
    // become a Program-scoped read: the query itself is always course-scoped.
    const query = generalEducationResponsesQuery({
      page: 1,
      programId: UUID.program,
    });

    expect(query).toBe(`programId=${UUID.program}`);
    expect(query).not.toContain("tab=");
    expect(query).not.toContain("stakeholder=");
  });

  it("exposes no view tab or stakeholder dimension for the Coordinator", () => {
    const raw = { tab: "program-wide", stakeholder: "ALUMNI" };

    expect(generalEducationResponsesQuery(parseGeneralEducationResponsesSearchParams(raw))).toBe(
      ""
    );
  });

  it("normalizes invalid facets instead of failing the page", () => {
    const state = parseGeneralEducationResponsesSearchParams({
      page: "0",
      termInstanceId: "not-a-uuid",
      status: "DRAFT-ISH",
      completion: "half",
      iloId: "",
    });

    expect(state).toEqual({ page: 1 });
  });

  it("builds an unfiltered URL from a partial state", () => {
    expect(buildGeneralEducationResponsesUrl()).toBe("/gen-ed-coordinator/responses");
    expect(buildGeneralEducationResponsesUrl({ page: 1, iloId: UUID.ilo })).toBe(
      `/gen-ed-coordinator/responses?iloId=${UUID.ilo}`
    );
  });
});
