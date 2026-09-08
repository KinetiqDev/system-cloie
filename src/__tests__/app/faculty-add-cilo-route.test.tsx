import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock, resolveAuthSessionMock, listCoursesMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  resolveAuthSessionMock: vi.fn(),
  listCoursesMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/evaluations/services/list-faculty-courses-with-cilos", () => ({
  listFacultyCoursesWithCilos: listCoursesMock,
}));
vi.mock("@/lib/actions/faculty-cilo-actions", () => ({
  loadCilosForCourseAction: vi.fn(),
  saveCilosForCourseAction: vi.fn(),
}));
vi.mock("@/app/(app)/faculty/cilos/new/add-cilo-form", () => ({
  AddCiloForm: (props: Record<string, unknown>) => (
    <div data-testid="add-cilo-form">
      <span>{String(props.initialCourseId ?? "no-course")}</span>
      <span>{String(props.returnTo ?? "no-return")}</span>
      <span>{JSON.stringify(props.courses)}</span>
    </div>
  ),
}));

describe("Faculty add CILO route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({ userId: "faculty-1" });
  });

  it("redirects unauthenticated users before loading courses", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);
    const { default: Page } = await import("@/app/(app)/faculty/cilos/new/page");

    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "REDIRECT:/portal/respondents"
    );
    expect(listCoursesMock).not.toHaveBeenCalled();
  });

  it("renders the server error when the Faculty course read fails", async () => {
    listCoursesMock.mockResolvedValue({
      success: false,
      error: "Faculty authentication is required.",
    });
    const { default: Page } = await import("@/app/(app)/faculty/cilos/new/page");

    const page = await Page({ searchParams: Promise.resolve({}) });

    expect(page.props.children[0].props.children).toBe("Add New CILO");
    expect(page.props.children[1].props.children.props.children).toBe(
      "Faculty authentication is required."
    );
  });

  it("passes a safe return path and selected course to the form", async () => {
    listCoursesMock.mockResolvedValue({
      success: true,
      data: {
        courses: [
          {
            id: "course-1",
            code: "CS101",
            title: "Intro to Computing",
            courseScope: "PROGRAM_SPECIFIC",
            courseScopeLabel: "Program-Specific",
            programId: "program-1",
            programCode: "BSCS",
            programName: "Computer Science",
            majorId: null,
            majorName: null,
            ciloCount: 0,
            readiness: "missing-cilos",
            coveredCiloCount: 0,
          },
        ],
        programs: [],
      },
    });
    const { default: Page } = await import("@/app/(app)/faculty/cilos/new/page");

    const page = await Page({
      searchParams: Promise.resolve({
        course: "course-1",
        returnTo: "/faculty/cilos?term=period-1",
      }),
    });

    expect(page.props.initialCourseId).toBe("course-1");
    expect(page.props.returnTo).toBe("/faculty/cilos?term=period-1");
    expect(page.props.courses).toEqual([
      expect.objectContaining({ id: "course-1", code: "CS101" }),
    ]);
  });

  it("drops return paths outside the Faculty CILO workspace", async () => {
    listCoursesMock.mockResolvedValue({ success: true, data: { courses: [], programs: [] } });
    const { default: Page } = await import("@/app/(app)/faculty/cilos/new/page");

    const page = await Page({
      searchParams: Promise.resolve({ returnTo: "/secretary/users" }),
    });

    expect(page.props.returnTo).toBeUndefined();
  });
});
