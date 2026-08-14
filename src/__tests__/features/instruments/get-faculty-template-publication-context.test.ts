import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  template: { findFirst: vi.fn() },
  course: { findUnique: vi.fn() },
  cilo: { findMany: vi.fn() },
  contexts: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: mocks.session,
}));
vi.mock("@/features/evaluations/services/list-faculty-course-contexts", () => ({
  listFacultyCourseContexts: mocks.contexts,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    instrumentTemplate: mocks.template,
    course: mocks.course,
    cILO: mocks.cilo,
  },
}));

import { getFacultyTemplatePublicationContext } from "@/features/instruments/services/manage-faculty-templates";

const TEMPLATE_ID = "aaaaaaa1-1111-4111-8111-111111111111";
const COURSE_ID = "bbbbbbb2-2222-4222-8222-222222222222";
const CILO_ID = "ccccccc3-3333-4333-8333-333333333333";
const PROGRAM_ID = "ddddddd4-4444-4444-8444-444444444444";
const FACULTY_ID = "eeeeeee5-5555-4555-8555-555555555555";

const FACULTY_SESSION = {
  userId: FACULTY_ID,
  activeRole: ROLES.FACULTY,
  roles: [ROLES.FACULTY],
};

const STRUCTURE = [
  {
    key: "cilo-items",
    title: "Course Intended Learning Outcomes Evaluation",
    description: "Bind each saved CILO to one Likert item.",
    order: 1,
    questions: [
      {
        key: "cilo-attainment-1",
        prompt: "I achieved the first course intended learning outcome.",
        type: "likert",
        order: 1,
        required: true,
        likertDescriptors: [
          { value: 1, label: "Not Achieved" },
          { value: 5, label: "Fully Achieved" },
        ],
      },
    ],
  },
];

function template(overrides: Record<string, unknown> = {}) {
  return {
    id: TEMPLATE_ID,
    name: "Course-Bound CILO Evaluation",
    is_active: true,
    template_type: "COURSE_BOUND",
    faculty_owner_id: FACULTY_ID,
    bound_course_id: COURSE_ID,
    bound_program_id: PROGRAM_ID,
    bound_major_id: null,
    structure: STRUCTURE,
    bound_course: {
      id: COURSE_ID,
      code: "ITRES1",
      title: "Capstone Project 1",
      course_scope: "PROGRAM_SPECIFIC",
      major_id: null,
      program_id: PROGRAM_ID,
      program: { id: PROGRAM_ID, code: "BSIT", name: "Information Technology" },
      major: null,
    },
    template_cilo_question_bindings: [
      {
        id: "f1",
        cilo_id: CILO_ID,
        cilo_description_snapshot: "Apply capstone planning fundamentals.",
        section_key: "cilo-items",
        item_key: "cilo-attainment-1",
        question_prompt_snapshot: "I achieved the first course intended learning outcome.",
      },
    ],
    ...overrides,
  };
}

describe("getFacultyTemplatePublicationContext course-context resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue(FACULTY_SESSION);
  });

  it("resolves a General Education Course on Course alone when it has no owning Program", async () => {
    mocks.template.findFirst.mockResolvedValue(
      template({
        bound_program_id: null,
        bound_course: {
          id: COURSE_ID,
          code: "GESTECH",
          title: "Science, Technology and Society",
          course_scope: "GENERAL_EDUCATION",
          major_id: null,
          program_id: null,
          program: null,
          major: null,
        },
      })
    );
    // GE Courses surface one context with an empty programId.
    mocks.course.findUnique.mockResolvedValue({
      id: COURSE_ID,
      course_scope: "GENERAL_EDUCATION",
    });
    mocks.contexts.mockResolvedValue({
      success: true,
      data: [
        {
          courseCode: "GESTECH",
          courseId: COURSE_ID,
          courseTitle: "Science, Technology and Society",
          courseType: "GENERAL_EDUCATION",
          majorId: null,
          majorName: null,
          programCode: "",
          programId: "",
          programName: "",
          scopeLabel: " - General Education",
        },
      ],
    });
    mocks.cilo.findMany.mockResolvedValue([
      { id: CILO_ID, description: "Analyze interactions between science, technology, and society." },
    ]);

    const result = await getFacultyTemplatePublicationContext(TEMPLATE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.course.code).toBe("GESTECH");
      expect(result.data.bindings).toHaveLength(1);
    }
  });

  it("rejects a Program-specific Course when the bound Program matches no context", async () => {
    mocks.template.findFirst.mockResolvedValue(template());
    mocks.course.findUnique.mockResolvedValue({
      id: COURSE_ID,
      course_scope: "PROGRAM_SPECIFIC",
    });
    mocks.contexts.mockResolvedValue({
      success: true,
      data: [
        {
          courseCode: "ITRES1",
          courseId: COURSE_ID,
          courseTitle: "Capstone Project 1",
          courseType: "PROGRAM_SPECIFIC",
          majorId: null,
          majorName: null,
          programCode: "BSBA",
          programId: "other-program",
          programName: "Business Administration",
          scopeLabel: "BSBA - Shared Program Course",
        },
      ],
    });

    const result = await getFacultyTemplatePublicationContext(TEMPLATE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("The saved course context is no longer available.");
    }
  });
});
