// fallow-ignore-file code-duplication
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { saveFacultyTemplateDraft } from "@/features/instruments/services/manage-faculty-templates";

const {
  resolveAuthSessionMock,
  affiliationFindManyMock,
  templateFindFirstMock,
  courseFindUniqueMock,
  ciloFindManyMock,
  goFindManyMock,
  listFacultyCourseContextsMock,
  transactionMock,
  templateUpdateMock,
  templateCreateMock,
  versionFindFirstMock,
  versionUpdateMock,
  versionCreateMock,
  bindingDeleteManyMock,
  bindingCreateManyMock,
  goBindingDeleteManyMock,
  goBindingCreateManyMock,
} = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  affiliationFindManyMock: vi.fn(),
  templateFindFirstMock: vi.fn(),
  courseFindUniqueMock: vi.fn(),
  ciloFindManyMock: vi.fn(),
  goFindManyMock: vi.fn(),
  listFacultyCourseContextsMock: vi.fn(),
  transactionMock: vi.fn(),
  templateUpdateMock: vi.fn(),
  templateCreateMock: vi.fn(),
  versionFindFirstMock: vi.fn(),
  versionUpdateMock: vi.fn(),
  versionCreateMock: vi.fn(),
  bindingDeleteManyMock: vi.fn(),
  bindingCreateManyMock: vi.fn(),
  goBindingDeleteManyMock: vi.fn(),
  goBindingCreateManyMock: vi.fn(),
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
    gO: { findMany: goFindManyMock },
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
    go_question_bindings: [],
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
  courseFindUniqueMock.mockResolvedValue({
    course_scope: "PROGRAM_SPECIFIC",
    program_id: "program-1",
  });
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
  goFindManyMock.mockResolvedValue([]);
  bindingDeleteManyMock.mockResolvedValue({ count: 1 });
  bindingCreateManyMock.mockResolvedValue({ count: 1 });
  goBindingDeleteManyMock.mockResolvedValue({ count: 0 });
  goBindingCreateManyMock.mockResolvedValue({ count: 0 });
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
        instrumentTemplateGoQuestionBinding: {
          deleteMany: goBindingDeleteManyMock,
          createMany: goBindingCreateManyMock,
        },
      })
    );

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

  it("persists Course-bound GO bindings against the bound Course's owning Program", async () => {
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
      template_go_question_bindings: [],
      versions: [{ id: "version-1", version_number: 1 }],
    });
    versionFindFirstMock.mockResolvedValue({ id: "version-1" });
    goFindManyMock.mockResolvedValue([{ id: "go-1", code: "GO1", description: "Collaborates" }]);
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
        instrumentTemplateGoQuestionBinding: {
          deleteMany: goBindingDeleteManyMock,
          createMany: goBindingCreateManyMock,
        },
      })
    );

    const result = await saveFacultyTemplateDraft({
      ...draftInput(),
      go_question_bindings: [{ goId: "go-1", itemKey: "question-a", sectionKey: "section-a" }],
    });

    expect(result).toEqual({ success: true, data: { id: TEMPLATE_ID } });
    // One GO may span several questions, and the snapshot comes from the live
    // GO, not from the client payload. question-a carries no CILO, so the
    // exclusivity gate passes; question-b stays CILO-bound.
    expect(goBindingCreateManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          go_id: "go-1",
          go_code_snapshot: "GO1",
          go_description_snapshot: "Collaborates",
          section_key: "section-a",
          item_key: "question-a",
          question_prompt_snapshot: "Question A",
          template_id: TEMPLATE_ID,
        }),
      ],
    });
  });

  it("rejects a Course-bound GO binding for a General Education course", async () => {
    courseFindUniqueMock.mockResolvedValue({
      course_scope: "GENERAL_EDUCATION",
      program_id: null,
    });

    const result = await saveFacultyTemplateDraft({
      ...draftInput(),
      go_question_bindings: [{ goId: "go-1", itemKey: "question-b", sectionKey: "section-b" }],
    });

    expect(result).toEqual({
      success: false,
      error: "Graduate Outcomes can only be assigned to questions in program-specific courses.",
    });
    expect(goBindingCreateManyMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects a Course-bound GO whose GO is outside the Course's owning Program", async () => {
    goFindManyMock.mockResolvedValue([]);

    const result = await saveFacultyTemplateDraft({
      ...draftInput(),
      go_question_bindings: [
        { goId: "go-foreign", itemKey: "question-b", sectionKey: "section-b" },
      ],
    });

    expect(result).toEqual({
      success: false,
      error: "One or more selected Graduate Outcomes are not available to this course.",
    });
    expect(goBindingCreateManyMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects a Course-bound GO on a question that already carries a CILO", async () => {
    goFindManyMock.mockResolvedValue([{ id: "go-1", code: "GO1", description: "Collaborates" }]);

    const result = await saveFacultyTemplateDraft({
      ...draftInput(),
      go_question_bindings: [{ goId: "go-1", itemKey: "question-b", sectionKey: "section-b" }],
    });

    expect(result).toEqual({
      success: false,
      error: "A Likert question can carry a CILO or Graduate Outcomes, not both.",
    });
    expect(goBindingCreateManyMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
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
        instrumentTemplateGoQuestionBinding: {
          deleteMany: goBindingDeleteManyMock,
          createMany: goBindingCreateManyMock,
        },
      })
    );

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

  it("persists one CILO bound to two Likert questions", async () => {
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
        instrumentTemplateGoQuestionBinding: {
          deleteMany: goBindingDeleteManyMock,
          createMany: goBindingCreateManyMock,
        },
      })
    );

    const result = await saveFacultyTemplateDraft({
      ...draftInput(),
      cilo_question_bindings: [
        { ciloId: "cilo-1", itemKey: "question-b", sectionKey: "section-b" },
        { ciloId: "cilo-1", itemKey: "question-a", sectionKey: "section-a" },
      ],
    });

    expect(result).toEqual({ success: true, data: { id: TEMPLATE_ID } });
    expect(bindingCreateManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ cilo_id: "cilo-1", item_key: "question-b" }),
        expect.objectContaining({ cilo_id: "cilo-1", item_key: "question-a" }),
      ],
    });
  });

  it("rejects two CILOs bound to the same Likert question", async () => {
    ciloFindManyMock.mockResolvedValue([
      { id: "cilo-1", description: "Communicates clearly" },
      { id: "cilo-2", description: "Solves problems" },
    ]);
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({})
    );

    const result = await saveFacultyTemplateDraft({
      ...draftInput(),
      cilo_question_bindings: [
        { ciloId: "cilo-1", itemKey: "question-b", sectionKey: "section-b" },
        { ciloId: "cilo-2", itemKey: "question-b", sectionKey: "section-b" },
      ],
    });

    expect(result).toEqual({
      success: false,
      error: "A Likert question can only be assigned one CILO.",
    });
    expect(bindingCreateManyMock).not.toHaveBeenCalled();
  });

  it("creates a blank draft owned by the faculty member's program", async () => {
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        instrumentTemplate: {
          create: templateCreateMock.mockResolvedValue({ id: "faculty-blank-1" }),
        },
        instrumentVersion: {
          create: versionCreateMock.mockResolvedValue({ id: "blank-version-1" }),
        },
        instrumentTemplateCiloQuestionBinding: {
          deleteMany: bindingDeleteManyMock,
          createMany: bindingCreateManyMock,
        },
        instrumentTemplateGoQuestionBinding: {
          deleteMany: goBindingDeleteManyMock,
          createMany: goBindingCreateManyMock,
        },
      })
    );

    const result = await saveFacultyTemplateDraft({ ...draftInput(), id: undefined });

    expect(result).toEqual({ success: true, data: { id: "faculty-blank-1" } });
    expect(templateFindFirstMock).not.toHaveBeenCalled();
    expect(templateCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        faculty_owner_id: FACULTY_ID,
        program_id: "program-1",
        source_template_id: null,
      }),
    });
  });

  it("copies from an explicitly selected starting template", async () => {
    templateFindFirstMock.mockResolvedValue({
      id: "shared-1",
      code: "SHARED_EVAL",
      name: "Shared",
      description: null,
      structure: REORDERED_STRUCTURE,
      program_id: "program-1",
      source_template_id: "origin-1",
      faculty_owner_id: null,
      template_cilo_question_bindings: [],
      versions: [],
    });
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        instrumentTemplate: {
          create: templateCreateMock.mockResolvedValue({ id: "faculty-copy-2" }),
        },
        instrumentVersion: {
          create: versionCreateMock.mockResolvedValue({ id: "copy-version-2" }),
        },
        instrumentTemplateCiloQuestionBinding: {
          deleteMany: bindingDeleteManyMock,
          createMany: bindingCreateManyMock,
        },
        instrumentTemplateGoQuestionBinding: {
          deleteMany: goBindingDeleteManyMock,
          createMany: goBindingCreateManyMock,
        },
      })
    );

    const result = await saveFacultyTemplateDraft({
      ...draftInput(),
      id: undefined,
      source_template_id: "shared-1",
    });

    expect(result).toEqual({ success: true, data: { id: "faculty-copy-2" } });
    expect(templateFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "shared-1" }) })
    );
    expect(templateCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        program_id: "program-1",
        source_template_id: "origin-1",
      }),
    });
  });

  it("refuses a starting template this faculty account cannot access", async () => {
    templateFindFirstMock.mockResolvedValue(null);
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({})
    );

    const result = await saveFacultyTemplateDraft({
      ...draftInput(),
      id: undefined,
      source_template_id: "foreign-1",
    });

    expect(result).toEqual({
      success: false,
      error: "Starting template not found or unavailable.",
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
