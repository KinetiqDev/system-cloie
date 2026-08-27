import { CourseScope, SystemRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveAuthSessionMock, createMock, updateManyMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  createMock: vi.fn(),
  updateManyMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { course: { create: createMock, updateMany: updateManyMock } },
}));

const COURSE_ID = "11111111-1111-4111-8111-111111111111";

describe("manage-gen-ed-courses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "22222222-2222-4222-8222-222222222222",
      activeRole: SystemRole.GEN_ED_COORDINATOR,
    });
    createMock.mockResolvedValue({ id: COURSE_ID });
    updateManyMock.mockResolvedValue({ count: 1 });
  });

  it("forces General Education scope during creation", async () => {
    const { createGenEdCourse } =
      await import("@/features/academic-structure/services/manage-gen-ed-courses");
    await expect(
      createGenEdCourse({
        code: "GE101",
        title: "General Education",
        course_scope: CourseScope.GENERAL_EDUCATION,
      })
    ).resolves.toEqual({ success: true, data: { id: COURSE_ID } });
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        course_scope: CourseScope.GENERAL_EDUCATION,
        program_id: null,
        major_id: null,
      }),
    });
  });

  it("constrains edits and lifecycle writes to General Education rows", async () => {
    const { updateGenEdCourse, setGenEdCourseActive } =
      await import("@/features/academic-structure/services/manage-gen-ed-courses");
    await updateGenEdCourse({
      id: COURSE_ID,
      code: "GE101",
      title: "Updated General Education",
      course_scope: CourseScope.GENERAL_EDUCATION,
    });
    await setGenEdCourseActive(COURSE_ID, false);

    expect(updateManyMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          id: COURSE_ID,
          course_scope: CourseScope.GENERAL_EDUCATION,
        }),
      })
    );
    expect(updateManyMock).toHaveBeenNthCalledWith(2, {
      where: { id: COURSE_ID, course_scope: CourseScope.GENERAL_EDUCATION },
      data: { is_active: false },
    });
  });

  it("fails closed for another active role", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user",
      activeRole: SystemRole.PROGRAM_HEAD,
    });
    const { setGenEdCourseActive } =
      await import("@/features/academic-structure/services/manage-gen-ed-courses");
    await expect(setGenEdCourseActive(COURSE_ID, false)).resolves.toEqual({
      success: false,
      error: "General Education Coordinator access required.",
    });
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("rejects forged Program-specific IDs", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    const { setGenEdCourseActive } =
      await import("@/features/academic-structure/services/manage-gen-ed-courses");
    await expect(setGenEdCourseActive(COURSE_ID, false)).resolves.toEqual({
      success: false,
      error: "Course not found or outside General Education scope.",
    });
  });
});
