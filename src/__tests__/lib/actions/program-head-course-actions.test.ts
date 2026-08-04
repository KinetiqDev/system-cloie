import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";

const { revalidatePathMock, resolveAuthSessionMock, createCourseMock, updateCourseMock, toggleCourseMock } =
  vi.hoisted(() => ({
    revalidatePathMock: vi.fn(),
    resolveAuthSessionMock: vi.fn(),
    createCourseMock: vi.fn(),
    updateCourseMock: vi.fn(),
    toggleCourseMock: vi.fn(),
  }));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({ resolveAuthSession: resolveAuthSessionMock }));
vi.mock("@/features/academic-structure/services/manage-program-head-courses", () => ({
  createProgramHeadCourse: createCourseMock,
  updateProgramHeadCourse: updateCourseMock,
  toggleProgramHeadCourseActive: toggleCourseMock,
}));

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";
const COURSE_ID = "22222222-2222-4222-8222-222222222222";

describe("Program Head Course actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.PROGRAM_HEAD });
    createCourseMock.mockResolvedValue({ success: true, data: { id: COURSE_ID } });
    updateCourseMock.mockResolvedValue({ success: true, data: { id: COURSE_ID } });
    toggleCourseMock.mockResolvedValue({ success: true, data: undefined });
  });

  it("passes selected Program input and revalidates the exact Courses path", async () => {
    const { createProgramHeadCourseAction } = await import("@/lib/actions/program-head-course-actions");
    const formData = new FormData();
    formData.set("programId", PROGRAM_ID);
    formData.set("code", "BSED-101");
    formData.set("title", "Foundations");
    formData.set("course_scope", CourseScope.PROGRAM_SPECIFIC);
    formData.set("course_type", "program-wide");

    await expect(createProgramHeadCourseAction(formData)).resolves.toEqual({ success: true });
    expect(createCourseMock).toHaveBeenCalledWith(expect.objectContaining({ programId: PROGRAM_ID }));
    expect(revalidatePathMock).toHaveBeenCalledWith(`/program-head/programs/${PROGRAM_ID}/courses`);
    expect(revalidatePathMock).not.toHaveBeenCalledWith("/program-head/courses");
  });

  it("rejects missing selected Program before invoking a write service", async () => {
    const { createProgramHeadCourseAction } = await import("@/lib/actions/program-head-course-actions");
    const formData = new FormData();
    formData.set("code", "BSED-101");
    formData.set("title", "Foundations");
    formData.set("course_scope", CourseScope.PROGRAM_SPECIFIC);

    await expect(createProgramHeadCourseAction(formData)).resolves.toMatchObject({ success: false });
    expect(createCourseMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("carries selected Program through toggle commands", async () => {
    const { toggleProgramHeadCourseActiveAction } = await import("@/lib/actions/program-head-course-actions");

    await expect(toggleProgramHeadCourseActiveAction(PROGRAM_ID, COURSE_ID, false)).resolves.toEqual({ success: true });
    expect(toggleCourseMock).toHaveBeenCalledWith({ programId: PROGRAM_ID, id: COURSE_ID, is_active: false });
    expect(revalidatePathMock).toHaveBeenCalledWith(`/program-head/programs/${PROGRAM_ID}/courses`);
  });
});
