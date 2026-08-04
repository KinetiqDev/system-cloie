import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const {
  courseAssignmentFindManyMock,
  instrumentTemplateFindFirstMock,
  getOnBehalfTemplatePublicationContextMock,
  resolveProgramHeadContextMock,
} = vi.hoisted(() => ({
  courseAssignmentFindManyMock: vi.fn(),
  instrumentTemplateFindFirstMock: vi.fn(),
  getOnBehalfTemplatePublicationContextMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseAssignment: { findMany: courseAssignmentFindManyMock },
    instrumentTemplate: { findFirst: instrumentTemplateFindFirstMock },
  },
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

vi.mock("@/features/evaluations/services/publish-course-bound-evaluation", () => ({
  getOnBehalfTemplatePublicationContext: getOnBehalfTemplatePublicationContextMock,
}));

const formProps = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }));

vi.mock("@/features/evaluations/components/publish-course-bound-evaluation-form-v2", () => ({
  PublishCourseBoundEvaluationFormV2: (props: Record<string, unknown>) => {
    formProps.current = props;
    return (
      <div>
        New evaluation form: {(props.assignments as Array<{ id: string }>).length} assignments
      </div>
    );
  },
}));

const bsedContext = {
  success: true as const,
  data: {
    authorizedPrograms: [
      { code: "BEED", id: "program-beed", name: "Bachelor of Elementary Education" },
      { code: "BSED", id: "program-bsed", name: "Bachelor of Secondary Education" },
    ],
    selectedProgram: {
      code: "BSED",
      id: "program-bsed",
      name: "Bachelor of Secondary Education",
    },
    userId: "head-1",
  },
};

function makeAssignment(overrides: Record<string, unknown>) {
  return {
    course: { code: "EDUC-101", id: "course-1", title: "Foundations of Education" },
    course_id: "course-1",
    faculty: { first_name: "Maria", id: "faculty-1", last_name: "Santos" },
    faculty_id: "faculty-1",
    id: "assignment-1",
    is_active: true,
    program: { code: "BSED", id: "program-bsed" },
    program_id: "program-bsed",
    section: "A",
    term_instance: {
      id: "term-1",
      school_year: { code: "2025-2026" },
      semester: "2ND",
      term: "REGULAR",
    },
    term_instance_id: "term-1",
    year_level: "FIRST",
    ...overrides,
  };
}

const validContext = {
  bindings: [],
  cilos: [{ description: "Design instruction", id: "cilo-1" }],
  course: { code: "EDUC-101", id: "course-1", title: "Foundations of Education" },
  programId: "program-bsed",
  template: { id: "template-1", name: "BSED CILO Evaluation", structure: [] },
};

describe("program head selected Program new CILO evaluation page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formProps.current = null;
    resolveProgramHeadContextMock.mockResolvedValue(bsedContext);
  });

  it("exposes only eligible selected-Program assignments with faculty-bound templates", async () => {
    courseAssignmentFindManyMock.mockResolvedValue([
      makeAssignment({}),
      makeAssignment({
        course: { code: "EDUC-102", id: "course-2", title: "Assessment in Learning" },
        course_id: "course-2",
        id: "assignment-2",
      }),
    ]);
    instrumentTemplateFindFirstMock.mockImplementation(async ({ where }) =>
      where.bound_course_id === "course-1" ? { id: "template-1" } : { id: "template-2" }
    );
    getOnBehalfTemplatePublicationContextMock.mockImplementation(async (templateId) =>
      templateId === "template-1"
        ? {
            success: true,
            data: {
              ...validContext,
              course: { code: "EDUC-101", id: "course-1", title: "Foundations of Education" },
            },
          }
        : {
            success: true,
            data: {
              ...validContext,
              course: { code: "EDUC-102", id: "course-2", title: "Assessment in Learning" },
              template: { ...validContext.template, id: "template-2" },
            },
          }
    );

    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/cilo-evaluations/new/page")
    ).default;
    const page = await Page({ params: Promise.resolve({ programId: "program-bsed" }) });

    render(page);

    expect(courseAssignmentFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          course: { course_scope: "PROGRAM_SPECIFIC" },
          course_bound_evaluations: { none: { published_at: { not: null } } },
          is_active: true,
          program_id: "program-bsed",
          term_instance: { status: "ACTIVE" },
        }),
      })
    );
    expect(instrumentTemplateFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bound_course_id: expect.any(String),
          faculty_owner_id: expect.any(String),
          is_active: true,
          template_type: "COURSE_BOUND",
        }),
      })
    );
    expect(screen.getByText("New evaluation form: 2 assignments")).toBeInTheDocument();
    const assignments = (formProps.current as { assignments: Array<{ id: string }> }).assignments;
    expect(assignments.map((a) => a.id)).toEqual(["assignment-1", "assignment-2"]);
    expect(formProps.current).toMatchObject({
      isOnBehalf: true,
      programId: "program-bsed",
      successRedirectPath: "/program-head/programs/program-bsed/tools",
    });
  });

  it("excludes assignments without a bound template or with a mismatched template context", async () => {
    courseAssignmentFindManyMock.mockResolvedValue([
      makeAssignment({}),
      makeAssignment({
        course: { code: "EDUC-102", id: "course-2", title: "Assessment in Learning" },
        course_id: "course-2",
        id: "assignment-2",
      }),
      makeAssignment({
        course: { code: "EDUC-103", id: "course-3", title: "Curriculum Development" },
        course_id: "course-3",
        id: "assignment-3",
      }),
    ]);
    instrumentTemplateFindFirstMock.mockImplementation(async ({ where }) =>
      where.bound_course_id === "course-1"
        ? { id: "template-1" }
        : where.bound_course_id === "course-2"
          ? { id: "template-2" }
          : null
    );
    getOnBehalfTemplatePublicationContextMock.mockImplementation(async (templateId) =>
      templateId === "template-1"
        ? { success: true, data: validContext }
        : {
            success: true,
            data: { ...validContext, programId: "program-beed" },
          }
    );

    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/cilo-evaluations/new/page")
    ).default;
    const page = await Page({ params: Promise.resolve({ programId: "program-bsed" }) });

    render(page);

    const assignments = (formProps.current as { assignments: Array<{ id: string }> }).assignments;
    expect(assignments.map((a) => a.id)).toEqual(["assignment-1"]);
    expect(screen.getByText("New evaluation form: 1 assignments")).toBeInTheDocument();
  });

  it("returns not-found when the selected Program is not assigned", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      error: "Selected Program is not assigned.",
      success: false,
    });

    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/cilo-evaluations/new/page")
    ).default;

    await expect(
      Page({ params: Promise.resolve({ programId: "program-beed" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(courseAssignmentFindManyMock).not.toHaveBeenCalled();
  });
});
