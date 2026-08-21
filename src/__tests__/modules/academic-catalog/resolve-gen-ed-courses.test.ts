import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";

const { resolveAuthSessionMock, courseFindManyMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  courseFindManyMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    course: { findMany: courseFindManyMock },
  },
}));

function course(overrides: Record<string, unknown> = {}) {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    code: "GEMATH",
    title: "Mathematics in the Modern World",
    description: null,
    course_scope: CourseScope.GENERAL_EDUCATION,
    program_id: null,
    major_id: null,
    is_active: true,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-05"),
    _count: { cilos: 0 },
    ...overrides,
  };
}

describe("resolve-gen-ed-courses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      activeRole: ROLES.GEN_ED_COORDINATOR,
      roles: [ROLES.GEN_ED_COORDINATOR],
    });
  });

  it("returns only GENERAL_EDUCATION ordered by code asc with counts", async () => {
    courseFindManyMock.mockResolvedValue([course({ code: "GEMATH" }), course({ id: "666", code: "GEUS", title: "Understanding the Self" })]);
    const { listGenEdCourses } = await import("@/features/academic-structure/services/resolve-gen-ed-courses");
    const result = await listGenEdCourses();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.courses).toHaveLength(2);
    expect(result.data.courses[0]?.course_scope).toBe(CourseScope.GENERAL_EDUCATION);
    expect(result.data.summary).toEqual({ total: 2, active: 2, archived: 0 });
    expect(courseFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { course_scope: CourseScope.GENERAL_EDUCATION }, orderBy: [{ code: "asc" }] })
    );
    // No program/major branching in predicate
    const where = courseFindManyMock.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where).not.toHaveProperty("program_id");
    expect(where).not.toHaveProperty("major_id");
  });

  it("summary splits active vs archived", async () => {
    courseFindManyMock.mockResolvedValue([course({ is_active: true }), course({ id: "666", is_active: false })]);
    const { listGenEdCourses } = await import("@/features/academic-structure/services/resolve-gen-ed-courses");
    const result = await listGenEdCourses();
    expect(result.success && result.data.summary).toEqual({ total: 2, active: 1, archived: 1 });
  });

  it("denies non-coordinator and unauth", async () => {
    const { listGenEdCourses } = await import("@/features/academic-structure/services/resolve-gen-ed-courses");
    resolveAuthSessionMock.mockResolvedValueOnce(null);
    await expect(listGenEdCourses()).resolves.toEqual(expect.objectContaining({ success: false }));
    expect(courseFindManyMock).not.toHaveBeenCalled();

    resolveAuthSessionMock.mockResolvedValueOnce({ userId: "u", activeRole: ROLES.FACULTY, roles: [ROLES.FACULTY] });
    await expect(listGenEdCourses()).resolves.toMatchObject({ success: false, error: expect.stringContaining("permission") });
    expect(courseFindManyMock).not.toHaveBeenCalled();
  });

  it("forged query params cannot widen scope — service predicate is fixed", async () => {
    courseFindManyMock.mockResolvedValue([course()]);
    const { listGenEdCourses } = await import("@/features/academic-structure/services/resolve-gen-ed-courses");
    const result = await listGenEdCourses();
    // Simulate caller passing PROGRAM_SPECIFIC would still get GENERAL_EDUCATION
    expect(courseFindManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: { course_scope: CourseScope.GENERAL_EDUCATION } }));
    expect(result.success && result.data.courses.every((c) => c.course_scope === CourseScope.GENERAL_EDUCATION)).toBe(true);
  });
});
