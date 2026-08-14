import { describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import SecretaryCourseAlignmentPage from "../../app/(app)/secretary/learning-outcomes/alignment/[courseId]/page";

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

const COURSE_ID = "11111111-1111-4111-8111-111111111111";

describe("Secretary Course alignment route", () => {
  it("redirects non-Secretary sessions before reading alignment", async () => {
    sessionMock.mockResolvedValue({
      userId: "dean-1",
      roles: [ROLES.DEAN],
      activeRole: ROLES.DEAN,
    });

    await expect(
      SecretaryCourseAlignmentPage({ params: Promise.resolve({ courseId: COURSE_ID }) })
    ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    expect(readAlignmentMock).not.toHaveBeenCalled();

    sessionMock.mockResolvedValue(null);
    await expect(
      SecretaryCourseAlignmentPage({ params: Promise.resolve({ courseId: COURSE_ID }) })
    ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    expect(readAlignmentMock).not.toHaveBeenCalled();
  });

  it("maps unavailable Course reads to the shared unavailable route", async () => {
    sessionMock.mockResolvedValue({
      userId: "secretary-1",
      roles: [ROLES.SECRETARY],
      activeRole: ROLES.SECRETARY,
    });
    readAlignmentMock.mockResolvedValue({
      success: false,
      error: "Course alignment is unavailable.",
    });

    await expect(
      SecretaryCourseAlignmentPage({ params: Promise.resolve({ courseId: COURSE_ID }) })
    ).rejects.toThrow(NOT_FOUND_ERROR);
    expect(readAlignmentMock).toHaveBeenCalledWith(COURSE_ID);
    expect(notFoundMock).toHaveBeenCalledOnce();
  });

  it("passes the college-wide alignment snapshot to the shared editor", async () => {
    sessionMock.mockResolvedValue({
      userId: "secretary-1",
      roles: [ROLES.SECRETARY],
      activeRole: ROLES.SECRETARY,
    });
    const alignment = {
      course: {
        id: COURSE_ID,
        code: "GESTECH",
        title: "Science, Technology and Society",
        scope: "GENERAL_EDUCATION" as const,
        program: null,
      },
      cilos: [],
      targets: [],
      unavailableTargets: [],
      readiness: "missing-cilos" as const,
      freshnessToken: "freshness",
    };
    readAlignmentMock.mockResolvedValue({ success: true, data: alignment });

    const page = await SecretaryCourseAlignmentPage({
      params: Promise.resolve({ courseId: COURSE_ID }),
    });

    expect(page.props.children[1].props.alignment).toEqual(alignment);
    expect(page.props.children[1].props.eyebrow).toBe("Secretary Course mapping administration");
  });
});
