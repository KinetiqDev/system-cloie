import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Regression: a faculty template cannot bind CILOs until it is bound to a
// Course, so the blank and edit routes ask for the Course first instead of
// dropping the author into a builder with an empty Course control.

const {
  listFacultyTemplatesMock,
  listFacultyCourseContextsMock,
  listFacultyCoursesWithCilosMock,
  getFacultyTemplateMock,
  redirectMock,
  notFoundMock,
} = vi.hoisted(() => ({
  listFacultyTemplatesMock: vi.fn(),
  listFacultyCourseContextsMock: vi.fn(),
  listFacultyCoursesWithCilosMock: vi.fn(),
  getFacultyTemplateMock: vi.fn(),
  redirectMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/features/instruments/services/list-faculty-templates", () => ({
  listFacultyTemplates: listFacultyTemplatesMock,
  getFacultyTemplate: getFacultyTemplateMock,
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn().mockResolvedValue({ userId: "faculty-1" }),
}));

vi.mock("@/features/evaluations/services/list-faculty-course-contexts", () => ({
  listFacultyCourseContexts: listFacultyCourseContextsMock,
}));

vi.mock("@/features/evaluations/services/list-faculty-courses-with-cilos", () => ({
  listFacultyCoursesWithCilos: listFacultyCoursesWithCilosMock,
}));

vi.mock("@/lib/actions/course-bound-evaluation-actions", () => ({
  listFacultyCourseContextsAction: listFacultyCourseContextsMock,
  loadFacultyManagedCilosAction: vi.fn(),
}));

vi.mock("@/lib/actions/faculty-template-actions", () => ({
  saveFacultyTemplateDraftAction: vi.fn(),
  loadFacultyCourseGoOptionsAction: vi.fn(),
  validateFacultyTemplatePublishReadinessAction: vi.fn(),
}));

const builderProps = vi.hoisted(() => ({
  props: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@/features/instruments/components/faculty-template-builder", () => ({
  FacultyTemplateBuilder: (props: Record<string, unknown>) => {
    builderProps.props = props;
    return <div data-testid="faculty-template-builder" />;
  },
}));

const PROGRAM = { code: "BSIT", id: "program-1", name: "Information Technology" };
const COURSE_ID = "8b69c52b-918f-43db-864b-d5cb09d3b4e8";

const courseContext = {
  courseCode: "IT401",
  courseId: COURSE_ID,
  courseTitle: "Capstone 1",
  courseType: "PROGRAM_SPECIFIC" as const,
  majorId: null,
  majorName: null,
  programCode: "BSIT",
  programId: PROGRAM.id,
  programName: PROGRAM.name,
  scopeLabel: "BSIT - Shared Program Course",
};

function facultyCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: COURSE_ID,
    code: "IT401",
    title: "Capstone 1",
    courseScope: "PROGRAM_SPECIFIC" as const,
    courseScopeLabel: "Program-Specific",
    programId: PROGRAM.id,
    programCode: "BSIT",
    programName: PROGRAM.name,
    majorId: null,
    majorName: null,
    ciloCount: 2,
    readiness: "incomplete-mapping" as const,
    coveredCiloCount: 1,
    ...overrides,
  };
}

function facultyTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: "e7c65302-5a13-4f33-b968-e960386ee3b8",
    code: "FT-1",
    name: "Faculty survey",
    description: null,
    templateType: "COURSE_BOUND" as const,
    is_active: true,
    is_faculty_accessible: true,
    boundCourseId: null,
    boundMajorId: null,
    boundProgramId: null,
    boundCourseCode: null,
    boundCourseTitle: null,
    programCode: PROGRAM.code,
    programName: PROGRAM.name,
    facultyOwnerId: "faculty-1",
    sourceTemplateId: null,
    structure: [],
    templateCiloQuestionBindings: [],
    templateGoQuestionBindings: [],
    versionCount: 1,
    ...overrides,
  };
}

describe("faculty template course gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    builderProps.props = undefined;
    listFacultyTemplatesMock.mockResolvedValue({
      success: true,
      data: { program: PROGRAM, templates: [] },
    });
    listFacultyCourseContextsMock.mockResolvedValue({ success: true, data: [courseContext] });
    listFacultyCoursesWithCilosMock.mockResolvedValue({
      success: true,
      data: { courses: [facultyCourse()], totalCourseCount: 1 },
    });
    getFacultyTemplateMock.mockResolvedValue({ success: true, data: facultyTemplate() });
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
  });

  test("blank route asks for a course before rendering the builder", async () => {
    const { default: Page } = await import("@/app/(app)/faculty/tools/new/blank/page");

    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Choose a Course" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with IT401/ })).toHaveAttribute(
      "href",
      `/faculty/tools/new/blank?course=${COURSE_ID}`
    );
    expect(builderProps.props).toBeUndefined();
  });

  test("blank route seeds the builder with the chosen course context", async () => {
    const { default: Page } = await import("@/app/(app)/faculty/tools/new/blank/page");

    render(await Page({ searchParams: Promise.resolve({ course: COURSE_ID }) }));

    expect(builderProps.props?.initialData).toMatchObject({
      bound_course_id: COURSE_ID,
      bound_program_id: PROGRAM.id,
      bound_major_id: null,
    });
  });

  test("edit route asks for a course when the template has none", async () => {
    const { default: Page } = await import("@/app/(app)/faculty/tools/[id]/edit/page");

    render(
      await Page({
        params: Promise.resolve({ id: "e7c65302-5a13-4f33-b968-e960386ee3b8" }),
        searchParams: Promise.resolve({}),
      })
    );

    expect(screen.getByRole("heading", { name: "Choose a Course" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with IT401/ })).toHaveAttribute(
      "href",
      `/faculty/tools/e7c65302-5a13-4f33-b968-e960386ee3b8/edit?course=${COURSE_ID}`
    );
    expect(builderProps.props).toBeUndefined();
  });

  test("edit route keeps the builder for an already-bound template", async () => {
    getFacultyTemplateMock.mockResolvedValue({
      success: true,
      data: facultyTemplate({
        boundCourseId: COURSE_ID,
        boundCourseCode: "IT401",
        boundCourseTitle: "Capstone 1",
        boundProgramId: PROGRAM.id,
      }),
    });
    const { default: Page } = await import("@/app/(app)/faculty/tools/[id]/edit/page");

    render(
      await Page({
        params: Promise.resolve({ id: "e7c65302-5a13-4f33-b968-e960386ee3b8" }),
        searchParams: Promise.resolve({}),
      })
    );

    expect(builderProps.props?.initialData).toMatchObject({ bound_course_id: COURSE_ID });
  });

  test("create-from-template route gates a source without a bound course", async () => {
    const sourceId = "e7c65302-5a13-4f33-b968-e960386ee3b8";
    const { default: Page } = await import("@/app/(app)/faculty/tools/new/from/[templateId]/page");

    render(
      await Page({
        params: Promise.resolve({ templateId: sourceId }),
        searchParams: Promise.resolve({}),
      })
    );

    expect(screen.getByRole("heading", { name: "Choose a Course" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with IT401/ })).toHaveAttribute(
      "href",
      `/faculty/tools/new/from/${sourceId}?course=${COURSE_ID}`
    );
    expect(builderProps.props).toBeUndefined();
  });

  test("create-from-template route keeps a bound source and skips the gate", async () => {
    const sourceId = "e7c65302-5a13-4f33-b968-e960386ee3b8";
    getFacultyTemplateMock.mockResolvedValue({
      success: true,
      data: facultyTemplate({
        boundCourseId: COURSE_ID,
        boundCourseCode: "IT401",
        boundCourseTitle: "Capstone 1",
        boundProgramId: PROGRAM.id,
        id: sourceId,
      }),
    });
    const { default: Page } = await import("@/app/(app)/faculty/tools/new/from/[templateId]/page");

    render(
      await Page({
        params: Promise.resolve({ templateId: sourceId }),
        searchParams: Promise.resolve({}),
      })
    );

    expect(builderProps.props?.startingFrom).toMatchObject({ id: sourceId });
    expect(builderProps.props?.initialData).toMatchObject({ bound_course_id: COURSE_ID });
  });
});
