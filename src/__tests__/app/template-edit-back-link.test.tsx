import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Regression: the template builder renders its own "Back to Tools" link via
// toolsHref, so page wrappers must not render a second one. Previously the
// faculty edit, secretary edit, and secretary new pages each added their own
// link, producing a duplicate on every surface.

const { notFoundMock, pushMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  useRouter: () => ({ push: pushMock }),
}));

const { getFacultyTemplateMock, listFacultyCourseContextsActionMock } = vi.hoisted(
  () => ({
    getFacultyTemplateMock: vi.fn(),
    listFacultyCourseContextsActionMock: vi.fn(),
  })
);

vi.mock("@/features/instruments/services/list-faculty-templates", () => ({
  getFacultyTemplate: getFacultyTemplateMock,
}));

vi.mock("@/lib/actions/course-bound-evaluation-actions", () => ({
  listFacultyCourseContextsAction: listFacultyCourseContextsActionMock,
  loadFacultyManagedCilosAction: vi.fn(),
}));

vi.mock("@/lib/actions/faculty-template-actions", () => ({
  saveFacultyTemplateDraftAction: vi.fn(),
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
        boundCourseId: null,
        boundMajorId: null,
        boundProgramId: null,
        programCode: null,
        programName: null,
        facultyOwnerId: null,
        sourceTemplateId: null,
        structure: [],
        templateCiloQuestionBindings: [],
        versionCount: 1,
      },
    });
    listFacultyCourseContextsActionMock.mockResolvedValue({ success: true, data: [] });
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
