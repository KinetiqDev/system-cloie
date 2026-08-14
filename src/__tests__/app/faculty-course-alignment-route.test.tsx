import { describe, expect, it, vi } from "vitest";
import CourseAlignmentPage from "../../app/(app)/faculty/cilos/[courseId]/alignment/page";

const NOT_FOUND_ERROR = "NEXT_NOT_FOUND";
const { notFoundMock, readAlignmentMock, redirectMock, sessionMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error(NOT_FOUND_ERROR);
  }),
  readAlignmentMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  sessionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock, redirect: redirectMock }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: sessionMock,
}));
vi.mock("@/features/outcomes/services/manage-course-alignment", () => ({
  readCourseAlignment: readAlignmentMock,
}));

describe("Faculty Course alignment route", () => {
  it("redirects a request without a session before loading alignment", async () => {
    sessionMock.mockResolvedValue(null);

    await expect(
      CourseAlignmentPage({
        params: Promise.resolve({ courseId: "11111111-1111-4111-8111-111111111111" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/portal/respondents");
    expect(readAlignmentMock).not.toHaveBeenCalled();
  });

  it("maps unauthorized or invalid Course results to the same unavailable route", async () => {
    sessionMock.mockResolvedValue({ userId: "faculty-1" });
    readAlignmentMock.mockResolvedValue({
      success: false,
      error: "Course alignment is unavailable.",
    });

    await expect(
      CourseAlignmentPage({
        params: Promise.resolve({ courseId: "not-a-course-id" }),
      })
    ).rejects.toThrow(NOT_FOUND_ERROR);
    expect(readAlignmentMock).toHaveBeenCalledWith("not-a-course-id");
    expect(notFoundMock).toHaveBeenCalledOnce();
  });

  it("passes the server-authorized alignment snapshot to the client editor", async () => {
    sessionMock.mockResolvedValue({ userId: "faculty-1" });
    const alignment = {
      course: {
        id: "11111111-1111-4111-8111-111111111111",
        code: "CS-101",
        title: "Computing",
        program: { id: "program-1", code: "BSCS", name: "Computer Science" },
      },
      cilos: [],
      targets: [],
      unavailableTargets: [],
      readiness: "missing-cilos" as const,
      freshnessToken: "freshness",
    };
    readAlignmentMock.mockResolvedValue({ success: true, data: alignment });

    const page = await CourseAlignmentPage({
      params: Promise.resolve({ courseId: alignment.course.id }),
    });

    expect(page.props.children.props.alignment).toEqual(alignment);
  });
});
