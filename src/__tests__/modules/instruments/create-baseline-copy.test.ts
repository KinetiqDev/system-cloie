import { beforeEach, describe, expect, it, vi } from "vitest";

const { contextMock, assignmentMock, transactionMock, templateCreateMock, versionCreateMock, programMock, ploFindManyMock, bindingDeleteManyMock, bindingCreateManyMock, templateFindUniqueMock, templateFindFirstMock } = vi.hoisted(() => ({
  contextMock: vi.fn(),
  assignmentMock: vi.fn(),
  transactionMock: vi.fn(),
  templateCreateMock: vi.fn(),
  versionCreateMock: vi.fn(),
  programMock: vi.fn(),
  ploFindManyMock: vi.fn(),
  bindingDeleteManyMock: vi.fn(),
  bindingCreateManyMock: vi.fn(),
  templateFindUniqueMock: vi.fn(),
  templateFindFirstMock: vi.fn(),
}));

const BASELINE_ROW = {
  id: "baseline-1",
  code: "CENTRAL",
  name: "Central",
  description: null,
  template_type: "PROGRAM_WIDE",
  is_faculty_accessible: false,
  structure: [],
  faculty_owner_id: null,
  program_id: null,
};

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: contextMock,
  revalidateProgramHeadAssignment: assignmentMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    instrumentTemplate: {
      // Baseline lookup is by id; code-collision lookup is by code.
      findUnique: templateFindUniqueMock,
      findFirst: templateFindFirstMock,
    },
    program: { findUnique: programMock },
    pLO: { findMany: ploFindManyMock },
    $transaction: transactionMock,
  },
}));

describe("createBaselineCopy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "ph-1",
        authorizedPrograms: [
          { id: "program-1", code: "BEED", name: "BEED" },
          { id: "program-2", code: "BSED", name: "BSED" },
        ],
        selectedProgram: { id: "program-2", code: "BSED", name: "BSED" },
      },
    });
    assignmentMock.mockResolvedValue({ id: "program-2", code: "BSED", name: "BSED" });
    programMock.mockResolvedValue({ code: "BSED" });
    templateFindUniqueMock.mockImplementation(({ where }: { where: { id?: string; code?: string } }) =>
      where.id ? Promise.resolve(BASELINE_ROW) : Promise.resolve(null)
    );
    templateFindFirstMock.mockResolvedValue(null);
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        instrumentTemplate: { create: templateCreateMock.mockResolvedValue({ id: "copy-1" }) },
        instrumentVersion: { create: versionCreateMock.mockResolvedValue({ id: "version-1" }) },
        instrumentTemplatePloQuestionBinding: {
          deleteMany: bindingDeleteManyMock.mockResolvedValue({ count: 0 }),
          createMany: bindingCreateManyMock.mockResolvedValue({ count: 0 }),
        },
      })
    );
  });

  it("creates a copy and version one with the exact reordered structure", async () => {
    const reorderedStructure = [
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
    const { createBaselineCopy } = await import("@/features/instruments/services/create-baseline-copy");
    const result = await createBaselineCopy({
      programId: "program-2",
      baselineId: "baseline-1",
      customName: "BSED Copy",
      structure: reorderedStructure,
      ploBindings: [],
    });

    expect(result).toEqual({ success: true, data: { id: "copy-1" } });
    expect(templateCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "BSED_BSED_COPY",
        program_id: "program-2",
        source_template_id: "baseline-1",
        structure: reorderedStructure,
      }),
    });
    expect(versionCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        template_id: "copy-1",
        version_number: 1,
        structure_snapshot: reorderedStructure,
        is_active: true,
      }),
    });
  });

  it("does not create a copy when the selected context is rejected", async () => {
    contextMock.mockResolvedValue({ success: false, error: "Selected Program is not assigned." });
    const { createBaselineCopy } = await import("@/features/instruments/services/create-baseline-copy");
    const result = await createBaselineCopy({ programId: "program-3", baselineId: "baseline-1", customName: "Copy", structure: [], ploBindings: [] });

    expect(result.success).toBe(false);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("persists PLO bindings as snapshots on the copied template", async () => {
    ploFindManyMock.mockResolvedValue([
      { id: "plo-1", code: "PLO-1", description: "Apply discipline knowledge" },
    ]);
    const structure = [
      {
        key: "section-b",
        title: "Section B",
        description: undefined,
        order: 0,
        questions: [
          { key: "question-b", prompt: "Question B", type: "likert" as const, order: 0, required: true },
          { key: "question-a", prompt: "Question A", type: "likert" as const, order: 1, required: true },
        ],
      },
    ];

    const { createBaselineCopy } = await import("@/features/instruments/services/create-baseline-copy");
    const result = await createBaselineCopy({
      programId: "program-2",
      baselineId: "baseline-1",
      customName: "BSED Copy",
      structure,
      ploBindings: [{ ploId: "plo-1", itemKey: "question-b", sectionKey: "section-b" }],
    });

    expect(result).toEqual({ success: true, data: { id: "copy-1" } });
    expect(bindingDeleteManyMock).toHaveBeenCalledWith({
      where: { template_id: "copy-1" },
    });
    expect(bindingCreateManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          plo_id: "plo-1",
          plo_code_snapshot: "PLO-1",
          plo_description_snapshot: "Apply discipline knowledge",
          section_key: "section-b",
          item_key: "question-b",
          question_prompt_snapshot: "Question B",
        }),
      ],
    });
  });

  it("rejects invalid PLO IDs in the baseline copy bindings", async () => {
    ploFindManyMock.mockResolvedValue([
      { id: "plo-1", code: "PLO-1", description: "Apply discipline knowledge" },
    ]);
    const structure = [
      {
        key: "section-1",
        title: "Section 1",
        description: undefined,
        order: 0,
        questions: [
          { key: "question-1", prompt: "Rate", type: "likert" as const, order: 0, required: true },
        ],
      },
    ];

    const { createBaselineCopy } = await import("@/features/instruments/services/create-baseline-copy");
    const result = await createBaselineCopy({
      programId: "program-2",
      baselineId: "baseline-1",
      customName: "Copy",
      structure,
      ploBindings: [{ ploId: "plo-999", itemKey: "question-1", sectionKey: "section-1" }],
    });

    expect(result.success).toBe(false);
    expect(result).toEqual({
      success: false,
      error: "One or more selected PLOs are invalid or no longer active.",
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects bindings that target a non-Likert question", async () => {
    ploFindManyMock.mockResolvedValue([
      { id: "plo-1", code: "PLO-1", description: "Apply discipline knowledge" },
    ]);
    const structure = [
      {
        key: "section-1",
        title: "Section 1",
        description: undefined,
        order: 0,
        questions: [
          { key: "question-1", prompt: "Comment", type: "guided_open_ended" as const, order: 0, required: false },
        ],
      },
    ];

    const { createBaselineCopy } = await import("@/features/instruments/services/create-baseline-copy");
    const result = await createBaselineCopy({
      programId: "program-2",
      baselineId: "baseline-1",
      customName: "Copy",
      structure,
      ploBindings: [{ ploId: "plo-1", itemKey: "question-1", sectionKey: "section-1" }],
    });

    expect(result.success).toBe(false);
    expect(result).toEqual({
      success: false,
      error: "PLOs can only be assigned to Likert questions.",
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("allows a second copy of the same baseline when the name differs", async () => {
    const { createBaselineCopy } = await import("@/features/instruments/services/create-baseline-copy");
    const result = await createBaselineCopy({
      programId: "program-2",
      baselineId: "baseline-1",
      customName: "BSED Copy 2",
      structure: [],
      ploBindings: [],
    });

    expect(result).toEqual({ success: true, data: { id: "copy-1" } });
    expect(templateCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "BSED_BSED_COPY_2",
      }),
    });
  });

  it("rejects a name that already exists in the program with a plain message", async () => {
    templateFindFirstMock.mockResolvedValue({ id: "existing-copy" });

    const { createBaselineCopy } = await import("@/features/instruments/services/create-baseline-copy");
    const result = await createBaselineCopy({
      programId: "program-2",
      baselineId: "baseline-1",
      customName: "BSED Copy",
      structure: [],
      ploBindings: [],
    });

    expect(result).toEqual({
      success: false,
      error: 'A template named "BSED Copy" already exists for this program. Try a different name.',
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("suffixes the code when the name-derived code is already taken", async () => {
    templateFindUniqueMock.mockImplementation(({ where }: { where: { id?: string; code?: string } }) => {
      if (where.id) return Promise.resolve(BASELINE_ROW);
      // The first candidate is taken; the suffixed one is free.
      return Promise.resolve(where.code === "BSED_BSED_COPY" ? { id: "taken" } : null);
    });

    const { createBaselineCopy } = await import("@/features/instruments/services/create-baseline-copy");
    const result = await createBaselineCopy({
      programId: "program-2",
      baselineId: "baseline-1",
      customName: "BSED Copy",
      structure: [],
      ploBindings: [],
    });

    expect(result).toEqual({ success: true, data: { id: "copy-1" } });
    expect(templateCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "BSED_BSED_COPY_2",
      }),
    });
  });
});
