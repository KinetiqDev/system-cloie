import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const {
  resolveAuthSessionMock,
  affiliationFindManyMock,
  templateFindFirstMock,
  courseFindUniqueMock,
  ciloFindManyMock,
  listFacultyCourseContextsMock,
  transactionMock,
  templateUpdateMock,
  templateCreateMock,
  versionFindFirstMock,
  versionUpdateMock,
  versionCreateMock,
  bindingDeleteManyMock,
  bindingCreateManyMock,
} = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  affiliationFindManyMock: vi.fn(),
  templateFindFirstMock: vi.fn(),
  courseFindUniqueMock: vi.fn(),
  ciloFindManyMock: vi.fn(),
  listFacultyCourseContextsMock: vi.fn(),
  transactionMock: vi.fn(),
  templateUpdateMock: vi.fn(),
  templateCreateMock: vi.fn(),
  versionFindFirstMock: vi.fn(),
  versionUpdateMock: vi.fn(),
  versionCreateMock: vi.fn(),
  bindingDeleteManyMock: vi.fn(),
  bindingCreateManyMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/evaluations/services/list-faculty-course-contexts", () => ({
  listFacultyCourseContexts: listFacultyCourseContextsMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    facultyProgramAffiliation: { findMany: affiliationFindManyMock },
    instrumentTemplate: { findFirst: templateFindFirstMock },
    course: { findUnique: courseFindUniqueMock },
    cILO: { findMany: ciloFindManyMock },
    $transaction: transactionMock,
  },
}));

const FACULTY_ID = "faculty-1";
const TEMPLATE_ID = "template-1";
const COURSE_ID = "course-1";
const REORDERED_STRUCTURE = [
  {
    key: "section-b",
    title: "Section B",
    description: undefined,
    order: 0,
    questions: [
      {
        key: "question-b",
        prompt: "Question B",
        type: "likert" as const,
        order: 0,
        required: true,
      },
    ],
  },
  {
    key: "section-a",
    title: "Section A",
    description: undefined,
    order: 1,
    questions: [
      {
        key: "question-a",
        prompt: "Question A",
        type: "likert" as const,
        order: 0,
        required: true,
      },
    ],
  },
];

function draftInput(id = TEMPLATE_ID) {
  return {
    id,
    name: "Reordered Faculty Evaluation",
    description: "Reordered draft",
    is_active: false,
    bound_course_id: COURSE_ID,
    bound_major_id: null,
    bound_program_id: "program-1",
    structure: REORDERED_STRUCTURE,
    cilo_question_bindings: [{ ciloId: "cilo-1", itemKey: "question-b", sectionKey: "section-b" }],
  };
}

function setSharedMocks() {
  resolveAuthSessionMock.mockResolvedValue({
    userId: FACULTY_ID,
    email: "faculty@cloie.test",
    roles: [ROLES.FACULTY],
    activeRole: ROLES.FACULTY,
    studentProfileId: null,
    profileGate: null,
  });
  affiliationFindManyMock.mockResolvedValue([{ program_id: "program-1" }]);
  courseFindUniqueMock.mockResolvedValue({ course_scope: "PROGRAM_SPECIFIC" });
  listFacultyCourseContextsMock.mockResolvedValue({
    success: true,
    data: [
      {
        courseId: COURSE_ID,
        courseType: "Major",
        majorId: null,
        majorName: null,
        programId: "program-1",
        programCode: "BSIT",
        programName: "BSIT",
        scopeLabel: "Program",
      },
    ],
  });
  ciloFindManyMock.mockResolvedValue([{ id: "cilo-1", description: "Communicates clearly" }]);
  bindingDeleteManyMock.mockResolvedValue({ count: 1 });
  bindingCreateManyMock.mockResolvedValue({ count: 1 });
}

describe("manage-faculty-templates structure persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSharedMocks();
  });

  it("updates a faculty-owned draft and its latest snapshot with stable binding keys", async () => {
    templateFindFirstMock.mockResolvedValue({
      id: TEMPLATE_ID,
      code: "SOURCE_EVAL",
      name: "Source",
      description: null,
      structure: REORDERED_STRUCTURE,
      program_id: "program-1",
      source_template_id: null,
      faculty_owner_id: FACULTY_ID,
      template_cilo_question_bindings: [],
      versions: [{ id: "version-1", version_number: 1 }],
    });
    versionFindFirstMock.mockResolvedValue({ id: "version-1" });
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        instrumentTemplate: {
          update: templateUpdateMock.mockResolvedValue({ id: TEMPLATE_ID }),
        },
        instrumentVersion: {
          findFirst: versionFindFirstMock,
          update: versionUpdateMock.mockResolvedValue({ id: "version-1" }),
        },
        instrumentTemplateCiloQuestionBinding: {
          deleteMany: bindingDeleteManyMock,
          createMany: bindingCreateManyMock,
        },
      })
    );

    const { saveFacultyTemplateDraft } =
      await import("@/features/instruments/services/manage-faculty-templates");
    const result = await saveFacultyTemplateDraft(draftInput());

    expect(result).toEqual({ success: true, data: { id: TEMPLATE_ID } });
    expect(templateUpdateMock).toHaveBeenCalledWith({
      where: { id: TEMPLATE_ID },
      data: expect.objectContaining({ is_active: false, structure: REORDERED_STRUCTURE }),
    });
    expect(versionUpdateMock).toHaveBeenCalledWith({
      where: { id: "version-1" },
      data: { structure_snapshot: REORDERED_STRUCTURE },
    });
    expect(bindingCreateManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          cilo_id: "cilo-1",
          section_key: "section-b",
          item_key: "question-b",
          template_id: TEMPLATE_ID,
        }),
      ],
    });
  });

  it("creates an accessible-source faculty copy and version one with stable binding keys", async () => {
    templateFindFirstMock.mockResolvedValue({
      id: "baseline-1",
      code: "SOURCE_EVAL",
      name: "Source",
      description: null,
      structure: REORDERED_STRUCTURE,
      program_id: null,
      source_template_id: null,
      faculty_owner_id: null,
      template_cilo_question_bindings: [],
      versions: [{ id: "baseline-version", version_number: 1 }],
    });
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        instrumentTemplate: {
          create: templateCreateMock.mockResolvedValue({ id: "faculty-copy-1" }),
        },
        instrumentVersion: {
          create: versionCreateMock.mockResolvedValue({ id: "copy-version-1" }),
        },
        instrumentTemplateCiloQuestionBinding: {
          deleteMany: bindingDeleteManyMock,
          createMany: bindingCreateManyMock,
        },
      })
    );

    const { saveFacultyTemplateDraft } =
      await import("@/features/instruments/services/manage-faculty-templates");
    const result = await saveFacultyTemplateDraft(draftInput("baseline-1"));

    expect(result).toEqual({ success: true, data: { id: "faculty-copy-1" } });
    expect(templateCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        faculty_owner_id: FACULTY_ID,
        is_active: false,
        source_template_id: "baseline-1",
        structure: REORDERED_STRUCTURE,
      }),
    });
    expect(versionCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        template_id: "faculty-copy-1",
        version_number: 1,
        structure_snapshot: REORDERED_STRUCTURE,
      }),
    });
    expect(bindingCreateManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          cilo_id: "cilo-1",
          section_key: "section-b",
          item_key: "question-b",
          template_id: "faculty-copy-1",
        }),
      ],
    });
  });
});
