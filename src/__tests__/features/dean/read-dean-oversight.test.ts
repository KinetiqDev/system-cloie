import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, readinessMock } = vi.hoisted(() => ({
  prismaMock: {
    academicTermInstance: { findFirst: vi.fn(), findUnique: vi.fn() },
    courseAssignment: { findMany: vi.fn(), findFirst: vi.fn() },
    studentEnrollment: { groupBy: vi.fn(), count: vi.fn(), findMany: vi.fn() },
  },
  readinessMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/academic-calendar/services/read-period-readiness", () => ({
  readPeriodReadiness: readinessMock,
}));

import {
  DeanReadModelNotFoundError,
  getDeanEnrollments,
  getDeanRoster,
} from "@/features/dean/services/read-dean-oversight";

const PERIOD_ID = "11111111-1111-4111-8111-111111111111";
const ASSIGNMENT_ID = "22222222-2222-4222-8222-222222222222";

function period(status: "ACTIVE" | "COMPLETED" = "ACTIVE") {
  return {
    id: PERIOD_ID,
    status,
    semester: "FIRST",
    term: "FIRST_TERM",
    school_year: { code: "2025-2026" },
  };
}

function assignment() {
  return {
    id: ASSIGNMENT_ID,
    course_id: "course-1",
    program_id: "program-1",
    year_level: "FIRST_YEAR",
    section: "MORNING",
    course: { code: "CS101", title: "Intro", is_active: true, course_scope: "PROGRAM_SPECIFIC", program_id: "program-1" },
    program: { id: "program-1", name: "Computer Science", is_active: true },
  };
}

describe("Dean oversight read model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses active period before completed fallback", async () => {
    prismaMock.academicTermInstance.findFirst.mockResolvedValue(period());
    prismaMock.courseAssignment.findMany.mockResolvedValue([]);

    await expect(getDeanEnrollments(undefined)).rejects.toThrow("period is required");
    expect(prismaMock.academicTermInstance.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "ACTIVE" },
    }));
  });

  it("requires an explicit period when only a completed period exists", async () => {
    prismaMock.academicTermInstance.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(period("COMPLETED"));
    prismaMock.courseAssignment.findMany.mockResolvedValue([]);

    await expect(getDeanEnrollments(undefined)).rejects.toThrow("period is required");
  });

  it("does not silently select a completed period for an omitted URL period", async () => {
    prismaMock.academicTermInstance.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(period("COMPLETED"));

    await expect(getDeanEnrollments(undefined)).rejects.toThrow("period is required");
    expect(prismaMock.academicTermInstance.findFirst).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { status: "COMPLETED" },
      orderBy: [{ end_date: "desc" }, { created_at: "desc" }],
    }));
  });

  it("returns enrollment counts from placement keys, not broad enrollment records", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findMany.mockResolvedValue([assignment()]);
    prismaMock.studentEnrollment.groupBy
      .mockResolvedValueOnce([{ program_id: "program-1", _count: { student_user_id: 2 } }])
      .mockResolvedValueOnce([{ program_id: "program-1", year_level: "FIRST_YEAR", section: "MORNING", _count: { student_user_id: 2 } }]);

    await expect(getDeanEnrollments(PERIOD_ID)).resolves.toEqual({
      state: "ready",
      data: {
        period: { id: PERIOD_ID, label: "2025-2026 — 1st Semester — 1st Term", status: "ACTIVE" },
        programs: [{
          id: "program-1",
          name: "Computer Science",
          enrolledStudentCount: 2,
          classes: [{
            assignmentId: ASSIGNMENT_ID,
            courseCode: "CS101",
            courseName: "Intro",
            yearLevel: "FIRST_YEAR",
            section: "MORNING",
            enrolledStudentCount: 2,
          }],
        }],
      },
    });
    expect(prismaMock.studentEnrollment.groupBy).toHaveBeenCalledTimes(2);
  });

  it("rejects assignment from another period before reading students", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findFirst.mockResolvedValue(null);

    await expect(getDeanRoster({ periodId: PERIOD_ID, assignmentId: ASSIGNMENT_ID, page: 1 }))
      .rejects.toBeInstanceOf(DeanReadModelNotFoundError);
    expect(prismaMock.studentEnrollment.findMany).not.toHaveBeenCalled();
  });

  it("rejects archived current-period assignments before reading students", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findFirst.mockResolvedValue(null);

    await expect(getDeanRoster({ periodId: PERIOD_ID, assignmentId: ASSIGNMENT_ID, page: 1 }))
      .rejects.toBeInstanceOf(DeanReadModelNotFoundError);
    expect(prismaMock.courseAssignment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        course: { is_active: true },
        program: { is_active: true },
      }),
    }));
  });

  it("queries roster within selected assignment placement and returns names only", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findFirst.mockResolvedValue(assignment());
    prismaMock.studentEnrollment.count.mockResolvedValue(1);
    prismaMock.studentEnrollment.findMany.mockResolvedValue([
      { student: { first_name: "Ada", last_name: "Lovelace" } },
    ]);

    const result = await getDeanRoster({ periodId: PERIOD_ID, assignmentId: ASSIGNMENT_ID, query: "Ada", page: 2 });

    expect(result).toEqual({
      state: "ready",
      data: {
        assignment: {
          id: ASSIGNMENT_ID,
          courseCode: "CS101",
          courseName: "Intro",
          programName: "Computer Science",
          yearLevel: "FIRST_YEAR",
          section: "MORNING",
        },
        students: [{ displayName: "Ada Lovelace" }],
        page: 1,
        pageSize: 25,
        totalCount: 1,
        totalPages: 1,
      },
    });
    expect(prismaMock.studentEnrollment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 0,
      take: 25,
      where: expect.objectContaining({
        term_instance_id: PERIOD_ID,
        program_id: "program-1",
        year_level: "FIRST_YEAR",
        section: "MORNING",
      }),
      select: { student: { select: { first_name: true, last_name: true } } },
      orderBy: [{ student: { first_name: "asc" } }, { student: { last_name: "asc" } }, { student_user_id: "asc" }],
    }));
    expect(JSON.stringify(result)).not.toMatch(/studentId|email|enrollmentId|source|accountId/i);
  });

  it("clamps roster pages before calculating Prisma offset", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findFirst.mockResolvedValue(assignment());
    prismaMock.studentEnrollment.count.mockResolvedValue(26);
    prismaMock.studentEnrollment.findMany.mockResolvedValue([{ student: { first_name: "Ada", last_name: "Lovelace" } }]);

    const result = await getDeanRoster({
      periodId: PERIOD_ID,
      assignmentId: ASSIGNMENT_ID,
      page: Number.MAX_SAFE_INTEGER,
    });

    expect(result).toMatchObject({ state: "ready", data: { page: 2, totalPages: 2 } });
    expect(prismaMock.studentEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 25, take: 25 })
    );
  });
});
