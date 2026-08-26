import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope } from "@prisma/client";

const { resolveProgramHeadContextMock, courseFindManyMock, majorFindManyMock } = vi.hoisted(() => ({
  resolveProgramHeadContextMock: vi.fn(),
  courseFindManyMock: vi.fn(),
  majorFindManyMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    course: { findMany: courseFindManyMock },
    major: { findMany: majorFindManyMock },
  },
}));

const BSED_ID = "11111111-1111-4111-8111-111111111111";
const BEED_ID = "22222222-2222-4222-8222-222222222222";
const BSED = { id: BSED_ID, code: "BSED", name: "Secondary Education" };
const BEED = { id: BEED_ID, code: "BEED", name: "Elementary Education" };

function course(overrides: Record<string, unknown> = {}) {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    code: "BSED-101",
    title: "Foundations",
    course_scope: CourseScope.PROGRAM_SPECIFIC,
    program_id: BSED_ID,
    major_id: null,
    default_year_level: null,
    default_semester: null,
    default_term: null,
    is_active: true,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    program: BSED,
    major: null,
    course_assignments: [{ _count: { course_bound_evaluations: 0 } }],
    _count: { cilos: 0 },
    ...overrides,
  };
}

describe("resolve-program-head-courses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        authorizedPrograms: [BEED, BSED],
        selectedProgram: BSED,
      },
    });
    courseFindManyMock.mockResolvedValueOnce([course()]);
    majorFindManyMock.mockResolvedValue([
      { id: "77777777-7777-4777-8777-777777777777", name: "English", program_id: BSED_ID },
    ]);
  });

  it("lists only selected-Program Courses", async () => {
    const { listProgramHeadCourses } =
      await import("@/features/academic-structure/services/resolve-program-head-courses");

    const result = await listProgramHeadCourses(BSED_ID);

    expect(result).toMatchObject({
      success: true,
      data: {
        program: BSED,
        majors: [{ program_id: BSED_ID }],
        summary: { total: 1, programWide: 1, majorSpecific: 0, archived: 0 },
      },
    });
    expect(result.success && result.data.courses).toHaveLength(1);
    expect(result.success && result.data.courses[0]?.course_scope).toBe(
      CourseScope.PROGRAM_SPECIFIC
    );
    expect(result.success && "isReadOnly" in (result.data.courses[0] ?? {})).toBe(false);
    expect(courseFindManyMock).toHaveBeenCalledTimes(1);
    expect(courseFindManyMock.mock.calls[0]?.[0]).toMatchObject({
      where: { program_id: BSED_ID, course_scope: CourseScope.PROGRAM_SPECIFIC },
    });
    expect(courseFindManyMock.mock.calls[0]?.[0].include.course_assignments).toMatchObject({
      where: { program_id: BSED_ID },
    });
  });

  it("does not expose data when the selected Program context is denied", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });
    const { listProgramHeadCourses } =
      await import("@/features/academic-structure/services/resolve-program-head-courses");

    await expect(listProgramHeadCourses(BEED_ID)).resolves.toEqual({
      success: false,
      error: "Selected Program is not assigned.",
    });
    expect(courseFindManyMock).not.toHaveBeenCalled();
  });
});
