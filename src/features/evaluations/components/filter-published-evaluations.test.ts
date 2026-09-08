import { describe, expect, it } from "vitest";

import type { PublishedEvaluationFilters } from "@/features/instruments/components/tools-view-state";
import {
  distinctCourseOptions,
  distinctPeriodOptions,
  filterPublishedEvaluations,
  hasActivePublishedFilters,
  type FilterablePublishedEvaluation,
} from "./filter-published-evaluations";

const PERIOD_NEW = "22222222-2222-4222-8222-222222222222";
const PERIOD_OLD = "11111111-1111-4111-8111-111111111111";
const COURSE_CS = "33333333-3333-4333-8333-333333333333";
const COURSE_IT = "44444444-4444-4434-8434-444444444444";

function makeItem(
  overrides: Partial<FilterablePublishedEvaluation> = {}
): FilterablePublishedEvaluation {
  return {
    evaluationId: "evaluation-1",
    deploymentName: "Capstone CILO Evaluation",
    courseId: COURSE_CS,
    courseCode: "CS101",
    courseTitle: "Introduction to Computing",
    termInstanceId: PERIOD_NEW,
    termInstanceLabel: "2026-2027 — 2nd Semester — 2nd Term",
    status: "ACTIVE",
    ...overrides,
  };
}

const BASE_FILTERS: PublishedEvaluationFilters = {
  periodId: null,
  courseId: null,
  query: "",
  status: "ALL",
};

describe("filterPublishedEvaluations", () => {
  it("excludes archived evaluations when the status filter is All", () => {
    const items = [makeItem(), makeItem({ evaluationId: "archived", status: "ARCHIVED" })];

    expect(filterPublishedEvaluations(items, BASE_FILTERS)).toHaveLength(1);
  });

  it("selects one lifecycle status at a time", () => {
    const items = [makeItem(), makeItem({ evaluationId: "closed", status: "CLOSED" })];

    const closed = filterPublishedEvaluations(items, { ...BASE_FILTERS, status: "CLOSED" });

    expect(closed.map((item) => item.evaluationId)).toEqual(["closed"]);
  });

  it("narrows by academic period", () => {
    const items = [
      makeItem(),
      makeItem({
        evaluationId: "old",
        termInstanceId: PERIOD_OLD,
        termInstanceLabel: "2024-2025 — 2nd Semester — 2nd Term",
      }),
    ];

    const filtered = filterPublishedEvaluations(items, { ...BASE_FILTERS, periodId: PERIOD_OLD });

    expect(filtered.map((item) => item.evaluationId)).toEqual(["old"]);
  });

  it("narrows by course", () => {
    const items = [
      makeItem(),
      makeItem({ evaluationId: "itres", courseId: COURSE_IT, courseCode: "ITRES1" }),
    ];

    const filtered = filterPublishedEvaluations(items, { ...BASE_FILTERS, courseId: COURSE_IT });

    expect(filtered.map((item) => item.evaluationId)).toEqual(["itres"]);
  });

  it("matches search text against name, course, and period", () => {
    const items = [
      makeItem(),
      makeItem({
        evaluationId: "geethics",
        deploymentName: "GEETHICS Post-Term CILO Evaluation",
        courseCode: "GEETHICS",
        courseTitle: "Ethics",
      }),
    ];

    expect(
      filterPublishedEvaluations(items, { ...BASE_FILTERS, query: "ethics" }).map(
        (item) => item.evaluationId
      )
    ).toEqual(["geethics"]);
    expect(
      filterPublishedEvaluations(items, { ...BASE_FILTERS, query: "  CAPSTONE  " }).map(
        (item) => item.evaluationId
      )
    ).toEqual(["evaluation-1"]);
  });

  it("combines every active filter with AND semantics", () => {
    const items = [
      makeItem(),
      makeItem({
        evaluationId: "match",
        deploymentName: "Capstone Review",
        courseId: COURSE_IT,
        courseCode: "ITRES1",
        courseTitle: "Capstone Project 1",
        status: "CLOSED",
      }),
    ];

    const filtered = filterPublishedEvaluations(items, {
      periodId: PERIOD_NEW,
      courseId: COURSE_IT,
      query: "review",
      status: "CLOSED",
    });

    expect(filtered.map((item) => item.evaluationId)).toEqual(["match"]);
  });
});

describe("distinctPeriodOptions", () => {
  it("dedupes periods and orders newest first", () => {
    const items = [
      makeItem({
        termInstanceId: PERIOD_OLD,
        termInstanceLabel: "2024-2025 — 2nd Semester — 2nd Term",
      }),
      makeItem(),
      makeItem({ evaluationId: "dup-new" }),
    ];

    expect(distinctPeriodOptions(items)).toEqual([
      { id: PERIOD_NEW, label: "2026-2027 — 2nd Semester — 2nd Term" },
      { id: PERIOD_OLD, label: "2024-2025 — 2nd Semester — 2nd Term" },
    ]);
  });
});

describe("distinctCourseOptions", () => {
  it("dedupes courses and orders by course code", () => {
    const items = [
      makeItem({ courseId: COURSE_IT, courseCode: "ITRES1", courseTitle: "Capstone Project 1" }),
      makeItem(),
      makeItem({ evaluationId: "dup-cs" }),
    ];

    expect(distinctCourseOptions(items)).toEqual([
      {
        id: COURSE_CS,
        code: "CS101",
        title: "Introduction to Computing",
        label: "CS101 · Introduction to Computing",
      },
      {
        id: COURSE_IT,
        code: "ITRES1",
        title: "Capstone Project 1",
        label: "ITRES1 · Capstone Project 1",
      },
    ]);
  });
});

describe("hasActivePublishedFilters", () => {
  it("reports defaults as inactive and any selection as active", () => {
    expect(hasActivePublishedFilters(BASE_FILTERS)).toBe(false);
    expect(hasActivePublishedFilters({ ...BASE_FILTERS, query: "  " })).toBe(false);
    expect(hasActivePublishedFilters({ ...BASE_FILTERS, status: "CLOSED" })).toBe(true);
    expect(hasActivePublishedFilters({ ...BASE_FILTERS, periodId: PERIOD_NEW })).toBe(true);
    expect(hasActivePublishedFilters({ ...BASE_FILTERS, courseId: COURSE_CS })).toBe(true);
    expect(hasActivePublishedFilters({ ...BASE_FILTERS, query: "capstone" })).toBe(true);
  });
});
