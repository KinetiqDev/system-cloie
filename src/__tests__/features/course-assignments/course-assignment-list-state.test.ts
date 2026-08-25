import { describe, expect, it } from "vitest";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";
import {
  isCanonicalCourseAssignmentListState,
  parseCourseAssignmentListState,
  serializeCourseAssignmentListState,
  toCourseAssignmentListOptions,
} from "@/features/course-assignments/course-assignment-list-state";

const TERM_ID = "11111111-1111-4111-a111-111111111111";
const COURSE_ID = "22222222-2222-4222-a222-222222222222";
const PROGRAM_ID = "33333333-3333-4333-a333-333333333333";

describe("course assignment list URL state", () => {
  it("parses supported filters and converts the public page to service pagination", () => {
    const state = parseCourseAssignmentListState(
      {
        page: "3",
        termInstanceId: TERM_ID,
        courseId: COURSE_ID,
        programId: PROGRAM_ID,
        yearLevel: YearLevel.SECOND_YEAR,
        section: StudentSection.AFTERNOON,
        courseScope: CourseScope.PROGRAM_SPECIFIC,
        isActive: "false",
        q: "  CS 101  ",
      },
      "all-program"
    );

    expect(state).toEqual({
      page: 3,
      filters: {
        termInstanceId: TERM_ID,
        courseId: COURSE_ID,
        programId: PROGRAM_ID,
        yearLevel: YearLevel.SECOND_YEAR,
        section: StudentSection.AFTERNOON,
        courseScope: CourseScope.PROGRAM_SPECIFIC,
        isActive: false,
        q: "CS 101",
      },
    });
    expect(toCourseAssignmentListOptions(state)).toEqual({ page: 2 });
  });

  it("round-trips the Secretary empty-roster attention filter", () => {
    const state = parseCourseAssignmentListState(
      { termInstanceId: TERM_ID, roster: "empty" },
      "all-program"
    );

    expect(state.filters).toMatchObject({
      termInstanceId: TERM_ID,
      isActive: true,
      hasActiveRosterMembers: false,
    });
    expect(serializeCourseAssignmentListState(state, "all-program").toString()).toBe(
      `termInstanceId=${TERM_ID}&roster=empty`
    );
  });

  it("uses the role default and removes Program Head program scope from URL input", () => {
    const state = parseCourseAssignmentListState(
      {
        programId: PROGRAM_ID,
        isActive: "not-a-boolean",
        q: " ",
      },
      "program-head"
    );

    expect(state).toEqual({ page: 1, filters: {} });
    expect(serializeCourseAssignmentListState(state, "program-head")).toEqual(
      new URLSearchParams()
    );
  });

  it("preserves an explicit all-statuses selection for all-program routes", () => {
    const state = parseCourseAssignmentListState({ isActive: "all" }, "all-program");

    expect(state).toEqual({
      page: 1,
      filters: {},
      isActiveMode: "all",
    });
    expect(serializeCourseAssignmentListState(state, "all-program").toString()).toBe(
      "isActive=all"
    );
    expect(isCanonicalCourseAssignmentListState({ isActive: "all" }, state, "all-program")).toBe(
      true
    );
  });

  it("uses the first non-empty duplicate and detects non-canonical input", () => {
    const raw = {
      page: ["", "2", "3"],
      unknown: "removed",
      q: ["", " faculty "],
    };
    const state = parseCourseAssignmentListState(raw, "program-head");

    expect(state).toEqual({ page: 2, filters: { q: "faculty" } });
    expect(isCanonicalCourseAssignmentListState(raw, state, "program-head")).toBe(false);
    expect(serializeCourseAssignmentListState(state, "program-head").toString()).toBe(
      "page=2&q=faculty"
    );
  });

  it("normalizes malformed values, empty queries, and out-of-contract pages", () => {
    const state = parseCourseAssignmentListState(
      {
        page: "0",
        courseId: "not-a-uuid",
        yearLevel: "FIFTH_YEAR",
        q: "x".repeat(101),
      },
      "all-program"
    );

    expect(state).toEqual({ page: 1, filters: { isActive: true } });
    expect(isCanonicalCourseAssignmentListState({}, state, "all-program")).toBe(true);
  });
});
