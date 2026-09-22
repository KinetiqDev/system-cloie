import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Regression: the template builder renders its own "Back to Tools" link via
// toolsHref, so page wrappers must not render a second one. Previously the
// faculty edit, secretary edit, and secretary new pages each added their own
// link, producing a duplicate on every surface.

const { notFoundMock, pushMock, redirectMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  pushMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn().mockResolvedValue({ userId: "faculty-1" }),
}));

const { getFacultyTemplateMock, listFacultyCourseContextsMock } = vi.hoisted(() => ({
  getFacultyTemplateMock: vi.fn(),
  listFacultyCourseContextsMock: vi.fn(),
}));

vi.mock("@/features/instruments/services/list-faculty-templates", () => ({
  getFacultyTemplate: getFacultyTemplateMock,
}));

// The faculty template routes load their course contexts through the service
// (the server action wraps it), so the loader is what needs the mock.
vi.mock("@/features/evaluations/services/list-faculty-course-contexts", () => ({
  listFacultyCourseContexts: listFacultyCourseContextsMock,
}));

vi.mock("@/features/evaluations/services/list-faculty-courses-with-cilos", () => ({
  listFacultyCoursesWithCilos: vi.fn().mockResolvedValue({
    success: true,
    data: { courses: [], totalCourseCount: 0 },
  }),
}));

vi.mock("@/lib/actions/course-bound-evaluation-actions", () => ({
  listFacultyCourseContextsAction: vi.fn(),
  loadFacultyManagedCilosAction: vi.fn(),
}));

vi.mock("@/lib/actions/faculty-template-actions", () => ({
  saveFacultyTemplateDraftAction: vi.fn(),
  loadFacultyCourseGoOptionsAction: vi.fn(),
  validateFacultyTemplatePublishReadinessAction: vi.fn(),
}));

vi.mock("@/features/instruments/services/manage-instruments", () => ({
  getBaselineTemplate: vi.fn().mockResolvedValue({
    id: "template-1",
    name: "Institutional baseline",
    description: null,
    template_type: "PROGRAM_WIDE",
    is_active: true,
    is_faculty_accessible: false,
    structure: [],
  }),
}));

const TEMPLATE_ID = "e7c65302-5a13-4f33-b968-e960386ee3b8";

describe("template edit pages render exactly one back link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );
    getFacultyTemplateMock.mockResolvedValue({
      success: true,
      data: {
        id: TEMPLATE_ID,
        code: "FT-1",
        name: "Faculty survey",
        description: null,
        templateType: "COURSE_BOUND",
        is_active: true,
        is_faculty_accessible: true,
        boundCourseId: "8b69c52b-918f-43db-864b-d5cb09d3b4e8",
        boundMajorId: null,
        boundProgramId: "program-1",
        programCode: null,
        programName: null,
        facultyOwnerId: "faculty-1",
        sourceTemplateId: null,
        structure: [],
        templateCiloQuestionBindings: [],
        templateGoQuestionBindings: [],
        versionCount: 1,
      },
    });
    listFacultyCourseContextsMock.mockResolvedValue({ success: true, data: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("faculty template edit page", async () => {
    const { default: Page } = await import("@/app/(app)/faculty/tools/[id]/edit/page");

    render(await Page({ params: Promise.resolve({ id: TEMPLATE_ID }) }));

    expect(screen.getAllByText("Back to Tools")).toHaveLength(1);
  });

  test("secretary template edit page", async () => {
    const { default: Page } = await import("@/app/(app)/secretary/instruments/[id]/edit/page");

    render(await Page({ params: Promise.resolve({ id: TEMPLATE_ID }) }));

    expect(screen.getAllByText("Back to Tools")).toHaveLength(1);
  });

  test("secretary template new page", async () => {
    const { default: Page } = await import("@/app/(app)/secretary/instruments/new/page");

    render(await Page());

    expect(screen.getAllByText("Back to Tools")).toHaveLength(1);
  });
});
