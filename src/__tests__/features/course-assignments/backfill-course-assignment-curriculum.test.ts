import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  courseAssignment: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  curriculumCourse: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import {
  backfillCourseAssignmentCurriculum,
  main,
} from "../../../../scripts/backfill-course-assignment-curriculum";

const curriculumCourse = (id: string, overrides = {}) => ({
  id,
  course_id: "course-1",
  year_level: "FIRST_YEAR",
  semester: "1ST",
  term: null,
  curriculum_version: {
    program_id: "program-1",
    status: "PUBLISHED",
    effective_from_school_year_id: null,
    effective_from_year: null,
  },
  ...overrides,
});

const termInstance = (overrides = {}) => ({
  semester: "1ST",
  term: null,
  school_year: { id: "school-year-1", start_date: new Date("2026-06-01") },
  ...overrides,
});

const assignment = (id: string, overrides = {}) => ({
  id,
  curriculum_course_id: null,
  course_id: "course-1",
  program_id: "program-1",
  year_level: "FIRST_YEAR",
  term_instance: termInstance(),
  ...overrides,
});

describe("backfillCourseAssignmentCurriculum", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.courseAssignment.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockImplementation(async (callback: (db: typeof prismaMock) => unknown) =>
      callback(prismaMock)
    );
  });

  it("links an assignment with one matching CurriculumCourse", async () => {
    prismaMock.courseAssignment.findMany.mockResolvedValue([
      assignment("assignment-1", { term_instance: termInstance({ term: "FIRST_TERM" }) }),
    ]);
    prismaMock.curriculumCourse.findMany.mockResolvedValue([
      curriculumCourse("curriculum-1", { term: "FIRST_TERM" }),
    ]);

    await expect(backfillCourseAssignmentCurriculum(prismaMock as never)).resolves.toEqual({
      totalAssignments: 1,
      linked: 1,
      unmatched: 0,
      ambiguous: 0,
    });
    expect(prismaMock.courseAssignment.updateMany).toHaveBeenCalledWith({
      where: { id: "assignment-1", curriculum_course_id: null },
      data: { curriculum_course_id: "curriculum-1" },
    });
  });

  it("leaves an assignment with no matching CurriculumCourse null", async () => {
    prismaMock.courseAssignment.findMany.mockResolvedValue([
      assignment("assignment-1", { term_instance: termInstance({ term: "FIRST_TERM" }) }),
    ]);
    prismaMock.curriculumCourse.findMany.mockResolvedValue([]);

    await expect(backfillCourseAssignmentCurriculum(prismaMock as never)).resolves.toEqual({
      totalAssignments: 1,
      linked: 0,
      unmatched: 1,
      ambiguous: 0,
    });
    expect(prismaMock.courseAssignment.updateMany).not.toHaveBeenCalled();
  });

  it("leaves an assignment with multiple matching CurriculumCourses null", async () => {
    prismaMock.courseAssignment.findMany.mockResolvedValue([
      assignment("assignment-1", { term_instance: termInstance({ term: "FIRST_TERM" }) }),
    ]);
    prismaMock.curriculumCourse.findMany.mockResolvedValue([
      curriculumCourse("curriculum-1", { term: "FIRST_TERM" }),
      curriculumCourse("curriculum-2", { term: "FIRST_TERM" }),
    ]);

    await expect(backfillCourseAssignmentCurriculum(prismaMock as never)).resolves.toEqual({
      totalAssignments: 1,
      linked: 0,
      unmatched: 0,
      ambiguous: 1,
    });
    expect(prismaMock.courseAssignment.updateMany).not.toHaveBeenCalled();
  });

  it("skips already-linked assignments on rerun", async () => {
    const linkedAssignment = assignment("assignment-1", {
      term_instance: termInstance({ term: "FIRST_TERM" }),
    });
    prismaMock.courseAssignment.findMany.mockResolvedValue([linkedAssignment]);
    prismaMock.curriculumCourse.findMany.mockResolvedValue([
      curriculumCourse("curriculum-1", { term: "FIRST_TERM" }),
    ]);

    prismaMock.courseAssignment.updateMany.mockImplementation(async ({ data }) => {
      Object.assign(linkedAssignment, data);
      return { count: 1 };
    });

    await backfillCourseAssignmentCurriculum(prismaMock as never);

    await expect(backfillCourseAssignmentCurriculum(prismaMock as never)).resolves.toEqual({
      totalAssignments: 1,
      linked: 0,
      unmatched: 0,
      ambiguous: 0,
    });
    expect(prismaMock.courseAssignment.updateMany).toHaveBeenCalledTimes(1);
  });

  it("matches regular terms exactly and requires null term for Summer", async () => {
    prismaMock.courseAssignment.findMany.mockResolvedValue([
      assignment("assignment-first-term", {
        term_instance: termInstance({ term: "FIRST_TERM" }),
      }),
      assignment("assignment-second-term", {
        term_instance: termInstance({ term: "SECOND_TERM" }),
      }),
      assignment("assignment-summer", {
        term_instance: termInstance({ semester: "SUMMER", term: null }),
      }),
      assignment("assignment-invalid-summer", {
        term_instance: termInstance({ semester: "SUMMER", term: "FIRST_TERM" }),
      }),
    ]);
    prismaMock.curriculumCourse.findMany.mockResolvedValue([
      curriculumCourse("curriculum-first-term", { term: "FIRST_TERM" }),
      curriculumCourse("curriculum-second-term", { term: "SECOND_TERM" }),
      curriculumCourse("curriculum-summer", { semester: "SUMMER", term: null }),
    ]);

    await expect(backfillCourseAssignmentCurriculum(prismaMock as never)).resolves.toEqual({
      totalAssignments: 4,
      linked: 3,
      unmatched: 1,
      ambiguous: 0,
    });
    expect(prismaMock.courseAssignment.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: "assignment-first-term", curriculum_course_id: null },
      data: { curriculum_course_id: "curriculum-first-term" },
    });
    expect(prismaMock.courseAssignment.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "assignment-second-term", curriculum_course_id: null },
      data: { curriculum_course_id: "curriculum-second-term" },
    });
    expect(prismaMock.courseAssignment.updateMany).toHaveBeenNthCalledWith(3, {
      where: { id: "assignment-summer", curriculum_course_id: null },
      data: { curriculum_course_id: "curriculum-summer" },
    });
  });

  it("retries a serialization conflict", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("serialization conflict", {
      code: "P2034",
      clientVersion: "test",
    });
    prismaMock.$transaction
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(async (callback: (db: typeof prismaMock) => unknown) => callback(prismaMock));
    prismaMock.courseAssignment.findMany.mockResolvedValue([]);
    prismaMock.curriculumCourse.findMany.mockResolvedValue([]);

    await expect(backfillCourseAssignmentCurriculum(prismaMock as never)).resolves.toEqual({
      totalAssignments: 0,
      linked: 0,
      unmatched: 0,
      ambiguous: 0,
    });
    expect(prismaMock.$transaction).toHaveBeenNthCalledWith(1, expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
  });

  it("logs all backfill counts", async () => {
    prismaMock.courseAssignment.findMany.mockResolvedValue([]);
    prismaMock.curriculumCourse.findMany.mockResolvedValue([]);
    const log = vi.fn();

    await main(log);

    expect(log).toHaveBeenCalledWith(
      "CourseAssignment curriculum backfill: total=0 linked=0 unmatched=0 ambiguous=0"
    );
  });

  it("ignores draft and retired versions when a published match exists", async () => {
    prismaMock.courseAssignment.findMany.mockResolvedValue([
      assignment("assignment-published", {
        term_instance: termInstance({ term: "FIRST_TERM" }),
      }),
      assignment("assignment-retired", {
        course_id: "course-2",
        term_instance: termInstance({ term: "FIRST_TERM" }),
      }),
    ]);
    prismaMock.curriculumCourse.findMany.mockResolvedValue([
      curriculumCourse("curriculum-published", {
        term: "FIRST_TERM",
        curriculum_version: {
          program_id: "program-1",
          status: "PUBLISHED",
          effective_from_school_year_id: null,
          effective_from_year: null,
        },
      }),
      curriculumCourse("curriculum-draft", {
        term: "FIRST_TERM",
        curriculum_version: {
          program_id: "program-1",
          status: "DRAFT",
          effective_from_school_year_id: null,
          effective_from_year: null,
        },
      }),
      curriculumCourse("curriculum-retired", {
        course_id: "course-2",
        term: "FIRST_TERM",
        curriculum_version: {
          program_id: "program-1",
          status: "RETIRED",
          effective_from_school_year_id: null,
          effective_from_year: null,
        },
      }),
    ]);

    await expect(backfillCourseAssignmentCurriculum(prismaMock as never)).resolves.toEqual({
      totalAssignments: 2,
      linked: 1,
      unmatched: 1,
      ambiguous: 0,
    });
    expect(prismaMock.courseAssignment.updateMany).toHaveBeenCalledWith({
      where: { id: "assignment-published", curriculum_course_id: null },
      data: { curriculum_course_id: "curriculum-published" },
    });
  });

  it("ignores a published version that starts after the assignment school year", async () => {
    prismaMock.courseAssignment.findMany.mockResolvedValue([
      assignment("assignment-2026", {
        term_instance: termInstance({ term: "FIRST_TERM" }),
      }),
    ]);
    prismaMock.curriculumCourse.findMany.mockResolvedValue([
      curriculumCourse("curriculum-2027", {
        term: "FIRST_TERM",
        curriculum_version: {
          program_id: "program-1",
          status: "PUBLISHED",
          effective_from_school_year_id: "school-year-2",
          effective_from_year: {
            id: "school-year-2",
            start_date: new Date("2027-06-01"),
          },
        },
      }),
    ]);

    await expect(backfillCourseAssignmentCurriculum(prismaMock as never)).resolves.toEqual({
      totalAssignments: 1,
      linked: 0,
      unmatched: 1,
      ambiguous: 0,
    });
    expect(prismaMock.courseAssignment.updateMany).not.toHaveBeenCalled();
  });

  it("links a published version effective from the assignment school year", async () => {
    prismaMock.courseAssignment.findMany.mockResolvedValue([
      assignment("assignment-2026", {
        term_instance: termInstance({ term: "FIRST_TERM" }),
      }),
    ]);
    prismaMock.curriculumCourse.findMany.mockResolvedValue([
      curriculumCourse("curriculum-2026", {
        term: "FIRST_TERM",
        curriculum_version: {
          program_id: "program-1",
          status: "PUBLISHED",
          effective_from_school_year_id: "school-year-1",
          effective_from_year: { id: "school-year-1", start_date: null },
        },
      }),
    ]);

    await expect(backfillCourseAssignmentCurriculum(prismaMock as never)).resolves.toMatchObject({
      linked: 1,
      unmatched: 0,
      ambiguous: 0,
    });
    expect(prismaMock.curriculumCourse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { curriculum_version: { status: "PUBLISHED" } } })
    );
  });

  it("links a published version effective from an earlier school year", async () => {
    prismaMock.courseAssignment.findMany.mockResolvedValue([
      assignment("assignment-2026", {
        term_instance: termInstance({ term: "FIRST_TERM" }),
      }),
    ]);
    prismaMock.curriculumCourse.findMany.mockResolvedValue([
      curriculumCourse("curriculum-2025", {
        term: "FIRST_TERM",
        curriculum_version: {
          program_id: "program-1",
          status: "PUBLISHED",
          effective_from_school_year_id: "school-year-0",
          effective_from_year: {
            id: "school-year-0",
            start_date: new Date("2025-06-01"),
          },
        },
      }),
    ]);

    await expect(backfillCourseAssignmentCurriculum(prismaMock as never)).resolves.toMatchObject({
      linked: 1,
      unmatched: 0,
      ambiguous: 0,
    });
  });
});
