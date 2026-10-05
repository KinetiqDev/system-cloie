import { CourseScope, StudentSection, YearLevel } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  activeCourseRosterFilterCount,
  courseRosterListPath,
  DEFAULT_COURSE_ROSTER_FILTERS,
  hasNonDefaultCourseRosterPeriod,
  isCanonicalCourseRosterListState,
  parseCourseRosterListState,
  serializeCourseRosterListState,
} from "@/features/course-assignments/course-roster-list-state";

const PERIOD_ID = "7a0211d0-5fa8-46e0-abff-9aed2f7d78a9";
const COURSE_ID = "65f5e114-f38d-40b0-8a32-e2b6020af5eb";
const PROGRAM_ID = "3e2f8f2d-cef5-40e8-932a-b06939a0f7de";

describe("parseCourseRosterListState", () => {
  it("defaults to the active-period scope, list view, and page one", () => {
    const state = parseCourseRosterListState({});

    expect(state).toEqual({
      page: 1,
      view: "list",
      filters: { ...DEFAULT_COURSE_ROSTER_FILTERS, search: "" },
    });
  });

  it("reads every supported filter", () => {
    const state = parseCourseRosterListState({
      page: "3",
      view: "card",
      period: "all",
      courseId: COURSE_ID,
      programId: PROGRAM_ID,
      yearLevel: YearLevel.SECOND_YEAR,
      section: StudentSection.EVENING,
      courseScope: CourseScope.GENERAL_EDUCATION,
      search: "  GESTECH  ",
    });

    expect(state.page).toBe(3);
    expect(state.view).toBe("card");
    expect(state.filters).toEqual({
      period: { mode: "all" },
      courseId: COURSE_ID,
      programId: PROGRAM_ID,
      yearLevel: YearLevel.SECOND_YEAR,
      section: StudentSection.EVENING,
      courseScope: CourseScope.GENERAL_EDUCATION,
      search: "GESTECH",
    });
  });

  it("treats a specific academic period as its own scope", () => {
    expect(parseCourseRosterListState({ period: PERIOD_ID }).filters.period).toEqual({
      mode: "term",
      termInstanceId: PERIOD_ID,
    });
  });

  it("reads the retired history param as the all-periods scope", () => {
    expect(parseCourseRosterListState({ history: "1" }).filters.period).toEqual({ mode: "all" });
  });

  it("prefers an explicit period over the retired history param", () => {
    expect(parseCourseRosterListState({ period: PERIOD_ID, history: "1" }).filters.period).toEqual({
      mode: "term",
      termInstanceId: PERIOD_ID,
    });
  });

  it("never widens the scope on an unrecognised period value", () => {
    expect(parseCourseRosterListState({ period: "everything" }).filters.period).toEqual({
      mode: "current",
    });
    expect(parseCourseRosterListState({ period: "not-a-uuid" }).filters.period).toEqual({
      mode: "current",
    });
    expect(
      parseCourseRosterListState({ period: "not-a-uuid", history: "1" }).filters.period
    ).toEqual({ mode: "current" });
    expect(parseCourseRosterListState({ period: "all", history: "1" }).filters.period).toEqual({
      mode: "all",
    });
  });

  it("drops values that fail validation instead of failing the request", () => {
    const state = parseCourseRosterListState({
      view: "gallery",
      page: "0",
      courseId: "nope",
      programId: "",
      yearLevel: "FIFTH_YEAR",
      section: "NIGHT",
      courseScope: "VOCATIONAL",
      search: "x".repeat(101),
    });

    expect(state.view).toBe("list");
    expect(state.page).toBe(1);
    expect(state.filters.courseId).toBeNull();
    expect(state.filters.programId).toBeNull();
    expect(state.filters.yearLevel).toBeNull();
    expect(state.filters.section).toBeNull();
    expect(state.filters.courseScope).toBeNull();
    expect(state.filters.search).toBe("");
  });

  it("reads the first value of a repeated param", () => {
    expect(parseCourseRosterListState({ programId: [PROGRAM_ID, "other"] }).filters.programId).toBe(
      PROGRAM_ID
    );
  });
});

describe("serializeCourseRosterListState", () => {
  it("omits every default so the bare route stays bare", () => {
    expect(
      serializeCourseRosterListState({
        page: 1,
        view: "list",
        filters: DEFAULT_COURSE_ROSTER_FILTERS,
      }).toString()
    ).toBe("");
  });

  it("round-trips a fully populated state", () => {
    const state = parseCourseRosterListState({
      page: "4",
      view: "card",
      period: "all",
      courseId: COURSE_ID,
      programId: PROGRAM_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
      courseScope: CourseScope.PROGRAM_SPECIFIC,
      search: "ethics",
    });

    expect(
      parseCourseRosterListState(Object.fromEntries(serializeCourseRosterListState(state)))
    ).toEqual(state);
  });

  it("serializes a specific period as its id", () => {
    const params = serializeCourseRosterListState({
      page: 1,
      view: "list",
      filters: {
        ...DEFAULT_COURSE_ROSTER_FILTERS,
        period: { mode: "term", termInstanceId: PERIOD_ID },
      },
    });

    expect(params.get("period")).toBe(PERIOD_ID);
  });
});

describe("courseRosterListPath", () => {
  it("appends only the non-default params", () => {
    expect(
      courseRosterListPath("/faculty/course-rosters", {
        page: 1,
        view: "list",
        filters: DEFAULT_COURSE_ROSTER_FILTERS,
      })
    ).toBe("/faculty/course-rosters");
  });

  it("carries every active filter and the view together", () => {
    expect(
      courseRosterListPath("/faculty/course-rosters", {
        page: 2,
        view: "card",
        filters: {
          ...DEFAULT_COURSE_ROSTER_FILTERS,
          period: { mode: "all" },
          programId: PROGRAM_ID,
          section: StudentSection.AFTERNOON,
          search: "CS",
        },
      })
    ).toBe(
      "/faculty/course-rosters?page=2&period=all&programId=" +
        PROGRAM_ID +
        "&section=AFTERNOON&search=CS&view=card"
    );
  });
});

describe("isCanonicalCourseRosterListState", () => {
  it("accepts a bare route and one built from its own state", () => {
    expect(isCanonicalCourseRosterListState({}, parseCourseRosterListState({}))).toBe(true);
    expect(
      isCanonicalCourseRosterListState(
        { view: "card" },
        parseCourseRosterListState({ view: "card" })
      )
    ).toBe(true);
  });

  it("rejects the retired history param so it redirects to the canonical period", () => {
    expect(isCanonicalCourseRosterListState({ history: "1" }, parseCourseRosterListState({}))).toBe(
      false
    );
  });

  it("rejects redundant params and reordered queries", () => {
    const state = parseCourseRosterListState({ search: "CS" });
    expect(isCanonicalCourseRosterListState({ search: "CS", view: "list" }, state)).toBe(false);
    expect(isCanonicalCourseRosterListState({ search: "CS", programId: PROGRAM_ID }, state)).toBe(
      false
    );
  });
});

describe("filter counting", () => {
  it("counts only the narrowing facets, not the period scope", () => {
    expect(activeCourseRosterFilterCount(DEFAULT_COURSE_ROSTER_FILTERS)).toBe(0);
    expect(
      activeCourseRosterFilterCount({
        ...DEFAULT_COURSE_ROSTER_FILTERS,
        period: { mode: "all" },
        programId: PROGRAM_ID,
        section: StudentSection.MORNING,
        search: "CS",
      })
    ).toBe(3);
  });

  it("reports a non-default period scope separately", () => {
    expect(hasNonDefaultCourseRosterPeriod({ mode: "current" })).toBe(false);
    expect(hasNonDefaultCourseRosterPeriod({ mode: "all" })).toBe(true);
    expect(hasNonDefaultCourseRosterPeriod({ mode: "term", termInstanceId: PERIOD_ID })).toBe(true);
  });
});
