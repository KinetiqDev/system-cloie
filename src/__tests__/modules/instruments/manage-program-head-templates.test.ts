import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvaluationTemplateType } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";
import { normalizePloQuestionBindings } from "@/features/instruments/services/manage-program-head-templates";

const {
  instrumentTemplateFindManyMock,
  instrumentTemplateFindUniqueMock,
  instrumentTemplateCreateMock,
  instrumentTemplateDeleteMock,
  instrumentTemplateUpdateMock,
  instrumentVersionCreateMock,
  instrumentVersionFindFirstMock,
  instrumentVersionUpdateMock,
  programFindUniqueMock,
  programHeadAssignmentFindManyMock,
  resolveAuthSessionMock,
  transactionMock,
  resolveProgramHeadContextMock,
  revalidateProgramHeadAssignmentMock,
  templatePloBindingDeleteManyMock,
  templatePloBindingCreateManyMock,
  ploFindManyMock,
} = vi.hoisted(() => ({
  instrumentTemplateFindManyMock: vi.fn(),
  instrumentTemplateFindUniqueMock: vi.fn(),
  instrumentTemplateCreateMock: vi.fn(),
  instrumentTemplateDeleteMock: vi.fn(),
  instrumentTemplateUpdateMock: vi.fn(),
  instrumentVersionCreateMock: vi.fn(),
  instrumentVersionFindFirstMock: vi.fn(),
  instrumentVersionUpdateMock: vi.fn(),
  programFindUniqueMock: vi.fn(),
  programHeadAssignmentFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  transactionMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
  revalidateProgramHeadAssignmentMock: vi.fn(),
  templatePloBindingDeleteManyMock: vi.fn(),
  templatePloBindingCreateManyMock: vi.fn(),
  ploFindManyMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    instrumentTemplate: {
      findMany: instrumentTemplateFindManyMock,
      findUnique: instrumentTemplateFindUniqueMock,
      create: instrumentTemplateCreateMock,
      delete: instrumentTemplateDeleteMock,
      update: instrumentTemplateUpdateMock,
    },
    instrumentVersion: {
      create: instrumentVersionCreateMock,
      findFirst: instrumentVersionFindFirstMock,
      update: instrumentVersionUpdateMock,
    },
    program: {
      findUnique: programFindUniqueMock,
    },
    pLO: {
      findMany: ploFindManyMock,
    },
    programHeadAssignment: {
      findMany: programHeadAssignmentFindManyMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
  revalidateProgramHeadAssignment: revalidateProgramHeadAssignmentMock,
}));

// ─── Test Fixtures ───────────────────────────────────────────────────────────

const PH_SESSION = {
  userId: "ph-user-1",
  email: "ph@acd.edu.ph",
  roles: [ROLES.PROGRAM_HEAD],
  activeRole: ROLES.PROGRAM_HEAD,
  studentProfileId: null,
  profileGate: null,
};

const PROGRAM_ID = "program-1";
const TEMPLATE_ID = "template-1";

const VALID_STRUCTURE = [
  {
    key: "sec-1",
    title: "Industry Readiness",
    description: "Evaluate readiness",
    order: 0,
    questions: [
      {
        key: "q-1",
        prompt: "Rate communication skills",
        type: "likert" as const,
        order: 0,
        required: true,
        likertDescriptors: [
          { value: 1, label: "Strongly Disagree" },
          { value: 2, label: "Disagree" },
          { value: 3, label: "Neutral" },
          { value: 4, label: "Agree" },
          { value: 5, label: "Strongly Agree" },
        ],
      },
    ],
  },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("manage-program-head-templates", () => {
  let listProgramHeadTemplates: typeof import("@/features/instruments/services/manage-program-head-templates").listProgramHeadTemplates;
  let createProgramHeadTemplate: typeof import("@/features/instruments/services/manage-program-head-templates").createProgramHeadTemplate;
  let updateProgramHeadTemplate: typeof import("@/features/instruments/services/manage-program-head-templates").updateProgramHeadTemplate;
  let duplicateTemplate: typeof import("@/features/instruments/services/manage-program-head-templates").duplicateTemplate;
  let deleteProgramHeadTemplate: typeof import("@/features/instruments/services/manage-program-head-templates").deleteProgramHeadTemplate;
  let toggleTemplateActive: typeof import("@/features/instruments/services/manage-program-head-templates").toggleTemplateActive;
  let toggleFacultyAccessible: typeof import("@/features/instruments/services/manage-program-head-templates").toggleFacultyAccessible;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: PH is authenticated with an active program assignment
    resolveAuthSessionMock.mockResolvedValue(PH_SESSION);
    programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: PROGRAM_ID }]);
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: PH_SESSION.userId,
        authorizedPrograms: [{ id: PROGRAM_ID, code: "BSIT", name: "BS Information Technology" }],
        selectedProgram: { id: PROGRAM_ID, code: "BSIT", name: "BS Information Technology" },
      },
    });
    revalidateProgramHeadAssignmentMock.mockResolvedValue({
      id: PROGRAM_ID,
      code: "BSIT",
      name: "BS Information Technology",
    });

    const mod = await import("@/features/instruments/services/manage-program-head-templates");
    listProgramHeadTemplates = mod.listProgramHeadTemplates;
    createProgramHeadTemplate = mod.createProgramHeadTemplate;
    updateProgramHeadTemplate = mod.updateProgramHeadTemplate;
    duplicateTemplate = mod.duplicateTemplate;
    deleteProgramHeadTemplate = mod.deleteProgramHeadTemplate;
    toggleTemplateActive = mod.toggleTemplateActive;
    toggleFacultyAccessible = mod.toggleFacultyAccessible;
  });

  // ─── listProgramHeadTemplates ──────────────────────────────────────

  it("PH can list templates (own program + institutional baselines)", async () => {
    programFindUniqueMock.mockResolvedValue({
      id: PROGRAM_ID,
      code: "BSIT",
      name: "BS Information Technology",
    });
    instrumentTemplateFindManyMock.mockResolvedValue([
      {
        id: TEMPLATE_ID,
        code: "BSIT_INDUSTRY_EVAL",
        name: "Industry Partners Evaluation",
        description: null,
        structure: VALID_STRUCTURE,
        is_active: true,
        is_faculty_accessible: false,
        program_id: PROGRAM_ID,
        created_at: new Date(),
        updated_at: new Date(),
        versions: [
          {
            id: "ver-1",
            version_number: 1,
            is_active: true,
            created_at: new Date(),
          },
        ],
        _count: { versions: 1 },
      },
    ]);

    const result = await listProgramHeadTemplates(PROGRAM_ID);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.templates).toHaveLength(1);

    // Program-owned template is not read-only
    const ownTemplate = result.data.templates.find((t) => t.id === TEMPLATE_ID);
    expect(ownTemplate?.isReadOnly).toBe(false);
  });

  it("does not expose faculty-owned drafts to a Program Head", async () => {
    programFindUniqueMock.mockResolvedValue({
      id: PROGRAM_ID,
      code: "BSIT",
      name: "BS Information Technology",
    });
    instrumentTemplateFindManyMock.mockResolvedValue([
      {
        id: "program-template",
        code: "PROGRAM_TEMPLATE",
        name: "Program Template",
        description: null,
        structure: VALID_STRUCTURE,
        is_active: true,
        is_faculty_accessible: false,
        program_id: PROGRAM_ID,
        faculty_owner_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        versions: [],
        _count: { versions: 1 },
      },
    ]);

    const result = await listProgramHeadTemplates(PROGRAM_ID);

    expect(result.success).toBe(true);
    expect(instrumentTemplateFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { program_id: PROGRAM_ID, faculty_owner_id: null } })
    );
  });

  // ─── createProgramHeadTemplate ─────────────────────────────────────

  it("PH can create a program-scoped template (with first version created atomically)", async () => {
    programFindUniqueMock.mockResolvedValue({
      id: PROGRAM_ID,
      code: "BSIT",
    });

    const createdTemplate = {
      id: TEMPLATE_ID,
      code: "BSIT_INDUSTRY_PARTNERS_EVALUATION_TOOL",
    };

    transactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        instrumentTemplate: {
          create: instrumentTemplateCreateMock.mockResolvedValue(createdTemplate),
        },
        instrumentVersion: {
          create: instrumentVersionCreateMock.mockResolvedValue({
            id: "ver-1",
          }),
        },
      };
      return fn(tx);
    });

    const result = await createProgramHeadTemplate({
      programId: PROGRAM_ID,
      name: "Industry Partners Evaluation Tool",
      description: "For evaluating industry partners.",
      template_type: EvaluationTemplateType.PROGRAM_WIDE,
      is_faculty_accessible: false,
      structure: VALID_STRUCTURE,
    });

    expect(result).toEqual({
      success: true,
      data: { id: TEMPLATE_ID },
    });

    // Verify template was created with correct data
    expect(instrumentTemplateCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Industry Partners Evaluation Tool",
        description: "For evaluating industry partners.",
        program_id: PROGRAM_ID,
        is_active: true,
        is_faculty_accessible: false,
      }),
    });

    // Verify first version was created
    expect(instrumentVersionCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        template_id: TEMPLATE_ID,
        version_number: 1,
        is_active: true,
      }),
    });
  });

  it("updates the exact reordered structure and latest snapshot when there are no deployments", async () => {
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
    instrumentTemplateFindUniqueMock.mockResolvedValue({
      id: TEMPLATE_ID,
      program_id: PROGRAM_ID,
      _count: { versions: 1 },
    });
    instrumentVersionFindFirstMock.mockResolvedValue(null);
    transactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        instrumentTemplate: {
          findUnique: instrumentTemplateFindUniqueMock.mockResolvedValue({ program_id: PROGRAM_ID }),
          update: instrumentTemplateUpdateMock.mockResolvedValue({ id: TEMPLATE_ID }),
        },
        instrumentVersion: {
          findFirst: instrumentVersionFindFirstMock.mockResolvedValue({ id: "ver-1" }),
          update: instrumentVersionUpdateMock.mockResolvedValue({ id: "ver-1" }),
        },
        instrumentTemplatePloQuestionBinding: {
          deleteMany: templatePloBindingDeleteManyMock.mockResolvedValue({ count: 0 }),
          createMany: templatePloBindingCreateManyMock.mockResolvedValue({ count: 0 }),
        },
      })
    );

    const result = await updateProgramHeadTemplate({
      programId: PROGRAM_ID,
      id: TEMPLATE_ID,
      name: "Reordered",
      template_type: EvaluationTemplateType.COURSE_BOUND,
      is_faculty_accessible: true,
      structure: reorderedStructure,
    });

    expect(result).toEqual({ success: true, data: { id: TEMPLATE_ID } });
    expect(instrumentTemplateUpdateMock).toHaveBeenCalledWith({
      where: { id: TEMPLATE_ID },
      data: expect.objectContaining({ structure: reorderedStructure }),
    });
    expect(instrumentVersionUpdateMock).toHaveBeenCalledWith({
      where: { id: "ver-1" },
      data: { structure_snapshot: reorderedStructure },
    });
    expect(instrumentVersionCreateMock).not.toHaveBeenCalled();
  });

  it("writes the exact reordered structure as a new version when deployments exist", async () => {
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
    instrumentTemplateFindUniqueMock.mockResolvedValue({
      id: TEMPLATE_ID,
      program_id: PROGRAM_ID,
      _count: { versions: 2 },
    });
    instrumentVersionFindFirstMock
      .mockResolvedValueOnce({ id: "deployed-version" })
      .mockResolvedValueOnce({ version_number: 2 });
    transactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        instrumentTemplate: {
          findUnique: instrumentTemplateFindUniqueMock.mockResolvedValue({ program_id: PROGRAM_ID }),
          update: instrumentTemplateUpdateMock.mockResolvedValue({ id: TEMPLATE_ID }),
        },
        instrumentVersion: {
          create: instrumentVersionCreateMock.mockResolvedValue({ id: "ver-3" }),
        },
        instrumentTemplatePloQuestionBinding: {
          deleteMany: templatePloBindingDeleteManyMock.mockResolvedValue({ count: 0 }),
          createMany: templatePloBindingCreateManyMock.mockResolvedValue({ count: 0 }),
        },
      })
    );

    const result = await updateProgramHeadTemplate({
      programId: PROGRAM_ID,
      id: TEMPLATE_ID,
      name: "Reordered",
      template_type: EvaluationTemplateType.COURSE_BOUND,
      is_faculty_accessible: true,
      structure: reorderedStructure,
    });

    expect(result).toEqual({ success: true, data: { id: TEMPLATE_ID } });
    expect(instrumentTemplateUpdateMock).toHaveBeenCalledWith({
      where: { id: TEMPLATE_ID },
      data: expect.objectContaining({ structure: reorderedStructure }),
    });
    expect(instrumentVersionCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        template_id: TEMPLATE_ID,
        version_number: 3,
        structure_snapshot: reorderedStructure,
        is_active: true,
      }),
    });
    expect(instrumentVersionUpdateMock).not.toHaveBeenCalled();
  });

  it("PH cannot create template outside assigned program", async () => {
    programHeadAssignmentFindManyMock.mockResolvedValue([]);
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "No active program assignment found for this Program Head.",
    });

    const result = await createProgramHeadTemplate({
      programId: PROGRAM_ID,
      name: "Test Template",
      template_type: EvaluationTemplateType.PROGRAM_WIDE,
      is_faculty_accessible: false,
      structure: VALID_STRUCTURE,
    });

    expect(result).toEqual({
      success: false,
      error: "No active program assignment found for this Program Head.",
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("structure JSON round-trips correctly through create", async () => {
    programFindUniqueMock.mockResolvedValue({
      id: PROGRAM_ID,
      code: "BSIT",
    });

    transactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        instrumentTemplate: {
          create: instrumentTemplateCreateMock.mockResolvedValue({
            id: TEMPLATE_ID,
          }),
        },
        instrumentVersion: {
          create: instrumentVersionCreateMock.mockResolvedValue({
            id: "ver-1",
          }),
        },
      };
      return fn(tx);
    });

    await createProgramHeadTemplate({
      programId: PROGRAM_ID,
      name: "Test Template",
      template_type: EvaluationTemplateType.PROGRAM_WIDE,
      is_faculty_accessible: false,
      structure: VALID_STRUCTURE,
    });

    // Verify the structure was passed as-is to the template
    const templateCreateCall = instrumentTemplateCreateMock.mock.calls[0][0];
    expect(templateCreateCall.data.structure).toEqual(VALID_STRUCTURE);

    // Verify the structure was also passed as snapshot to the version
    const versionCreateCall = instrumentVersionCreateMock.mock.calls[0][0];
    expect(versionCreateCall.data.structure_snapshot).toEqual(VALID_STRUCTURE);
  });

  // ─── updateProgramHeadTemplate ─────────────────────────────────────

  it("PH can update own template", async () => {
    instrumentTemplateFindUniqueMock.mockResolvedValue({
      id: TEMPLATE_ID,
      program_id: PROGRAM_ID,
      _count: { versions: 1 },
    });

    // No deployments exist
    instrumentVersionFindFirstMock.mockResolvedValue(null);

    transactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        instrumentTemplate: {
          findUnique: instrumentTemplateFindUniqueMock.mockResolvedValue({ program_id: PROGRAM_ID }),
          update: instrumentTemplateUpdateMock.mockResolvedValue({
            id: TEMPLATE_ID,
          }),
        },
        instrumentVersion: {
          findFirst: instrumentVersionFindFirstMock.mockResolvedValue({
            id: "ver-1",
          }),
          update: instrumentVersionUpdateMock.mockResolvedValue({
            id: "ver-1",
          }),
        },
        instrumentTemplatePloQuestionBinding: {
          deleteMany: templatePloBindingDeleteManyMock.mockResolvedValue({ count: 0 }),
          createMany: templatePloBindingCreateManyMock.mockResolvedValue({ count: 0 }),
        },
      };
      return fn(tx);
    });

    const result = await updateProgramHeadTemplate({
      programId: PROGRAM_ID,
      id: TEMPLATE_ID,
      name: "Updated Name",
      description: "Updated description",
      template_type: EvaluationTemplateType.COURSE_BOUND,
      is_faculty_accessible: true,
      structure: VALID_STRUCTURE,
    });

    expect(result).toEqual({
      success: true,
      data: { id: TEMPLATE_ID },
    });
  });

  it("denies every selected-context mutation for a template owned by another assigned Program", async () => {
    const selectedProgramId = "program-2";
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: PH_SESSION.userId,
        authorizedPrograms: [
          { id: PROGRAM_ID, code: "BEED", name: "BEED" },
          { id: selectedProgramId, code: "BSED", name: "BSED" },
        ],
        selectedProgram: { id: selectedProgramId, code: "BSED", name: "BSED" },
      },
    });
    instrumentTemplateFindUniqueMock.mockResolvedValue({
      id: TEMPLATE_ID,
      program_id: PROGRAM_ID,
      template_type: "COURSE_BOUND",
      _count: { versions: 1 },
      versions: [{ _count: { course_bounds: 0, central_insts: 0 } }],
    });

    const updateResult = await updateProgramHeadTemplate({
      programId: selectedProgramId,
      id: TEMPLATE_ID,
      name: "Cross Program",
      template_type: EvaluationTemplateType.COURSE_BOUND,
      is_faculty_accessible: true,
      structure: VALID_STRUCTURE,
    });
    const duplicateResult = await duplicateTemplate(selectedProgramId, TEMPLATE_ID);
    const toggleResult = await toggleTemplateActive(selectedProgramId, TEMPLATE_ID, false);
    const deleteResult = await deleteProgramHeadTemplate(selectedProgramId, TEMPLATE_ID);

    expect(updateResult.success).toBe(false);
    expect(duplicateResult.success).toBe(false);
    expect(toggleResult.success).toBe(false);
    expect(deleteResult.success).toBe(false);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("PH cannot update institutional baseline template", async () => {
    instrumentTemplateFindUniqueMock.mockResolvedValue({
      id: "baseline-1",
      program_id: null,
      _count: { versions: 1 },
    });

    const result = await updateProgramHeadTemplate({
      programId: PROGRAM_ID,
      id: "baseline-1",
      name: "Attempt update",
      template_type: EvaluationTemplateType.PROGRAM_WIDE,
      is_faculty_accessible: false,
      structure: VALID_STRUCTURE,
    });

    expect(result).toEqual({
      success: false,
      error: "Institutional baseline templates cannot be modified by Program Heads.",
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  // ─── duplicateTemplate ─────────────────────────────────────────────

  it("PH can duplicate a template", async () => {
    programFindUniqueMock.mockResolvedValue({
      id: PROGRAM_ID,
      code: "BSIT",
    });

    instrumentTemplateFindUniqueMock.mockResolvedValue({
      name: "Original Template",
      description: "Original description",
      structure: VALID_STRUCTURE,
      template_type: "PROGRAM_WIDE",
      is_faculty_accessible: false,
      program_id: PROGRAM_ID,
      faculty_owner_id: null,
      template_plo_question_bindings: [],
    });

    const createdDuplicate = { id: "dup-1" };
    transactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        instrumentTemplate: {
          create: instrumentTemplateCreateMock.mockResolvedValue(createdDuplicate),
        },
        instrumentVersion: {
          create: instrumentVersionCreateMock.mockResolvedValue({
            id: "ver-dup-1",
          }),
        },
      };
      return fn(tx);
    });

    const result = await duplicateTemplate(PROGRAM_ID, TEMPLATE_ID);

    expect(result).toEqual({
      success: true,
      data: { id: "dup-1" },
    });

    // Verify name has " (Copy)" suffix
    const createCall = instrumentTemplateCreateMock.mock.calls[0][0];
    expect(createCall.data.name).toBe("Original Template (Copy)");
    expect(createCall.data.program_id).toBe(PROGRAM_ID);
    expect(createCall.data.structure).toEqual(VALID_STRUCTURE);
  });

  it("drops question–PLO bindings when duplicating an institutional baseline", async () => {
    programFindUniqueMock.mockResolvedValue({
      id: PROGRAM_ID,
      code: "BSIT",
    });

    instrumentTemplateFindUniqueMock.mockResolvedValue({
      name: "Baseline Exit Survey",
      description: null,
      structure: VALID_STRUCTURE,
      template_type: "PROGRAM_WIDE",
      is_faculty_accessible: false,
      program_id: null,
      faculty_owner_id: null,
      template_plo_question_bindings: [
        {
          plo_id: "plo-baseline-1",
          plo_code_snapshot: "BSIT-GO1",
          plo_description_snapshot: "Snapshot desc",
          section_key: "sec-1",
          item_key: "q-1",
          question_prompt_snapshot: "Prompt",
        },
      ],
    });

    transactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        instrumentTemplate: {
          create: instrumentTemplateCreateMock.mockResolvedValue({ id: "dup-baseline" }),
        },
        instrumentVersion: {
          create: instrumentVersionCreateMock.mockResolvedValue({ id: "ver-dup-baseline" }),
        },
        instrumentTemplatePloQuestionBinding: {
          createMany: templatePloBindingCreateManyMock.mockResolvedValue({ count: 0 }),
        },
      };
      return fn(tx);
    });

    const result = await duplicateTemplate(PROGRAM_ID, "baseline-1");

    expect(result).toEqual({
      success: true,
      data: { id: "dup-baseline" },
    });
    // Baseline PLOs are not this program's PLOs — the copy must start unbound.
    expect(templatePloBindingCreateManyMock).not.toHaveBeenCalled();
  });

  // ─── toggleTemplateActive ──────────────────────────────────────────

  it("PH can delete an owned template with no deployments", async () => {
    instrumentTemplateFindUniqueMock.mockResolvedValue({
      id: TEMPLATE_ID,
      program_id: PROGRAM_ID,
      versions: [
        {
          _count: {
            course_bounds: 0,
            central_insts: 0,
          },
        },
      ],
    });
    instrumentTemplateDeleteMock.mockResolvedValue({ id: TEMPLATE_ID });
    instrumentTemplateFindUniqueMock.mockResolvedValue({
      program_id: PROGRAM_ID,
      versions: [{ _count: { course_bounds: 0, central_insts: 0 } }],
    });
    transactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        instrumentTemplate: {
          findUnique: instrumentTemplateFindUniqueMock.mockResolvedValue({ program_id: PROGRAM_ID }),
          delete: instrumentTemplateDeleteMock,
        },
      })
    );

    const result = await deleteProgramHeadTemplate(PROGRAM_ID, TEMPLATE_ID);

    expect(result).toEqual({ success: true, data: undefined });
    expect(instrumentTemplateDeleteMock).toHaveBeenCalledWith({
      where: { id: TEMPLATE_ID },
    });
  });

  it("PH cannot delete a template with deployments", async () => {
    instrumentTemplateFindUniqueMock.mockResolvedValue({
      id: TEMPLATE_ID,
      program_id: PROGRAM_ID,
      versions: [
        {
          _count: {
            course_bounds: 1,
            central_insts: 0,
          },
        },
      ],
    });

    const result = await deleteProgramHeadTemplate(PROGRAM_ID, TEMPLATE_ID);

    expect(result).toEqual({
      success: false,
      error: "Templates with published deployments cannot be deleted. Deactivate them instead.",
    });
    expect(instrumentTemplateDeleteMock).not.toHaveBeenCalled();
  });

  it("PH can toggle active within program scope", async () => {
    instrumentTemplateFindUniqueMock.mockResolvedValue({
      id: TEMPLATE_ID,
      program_id: PROGRAM_ID,
      template_type: "COURSE_BOUND",
    });
    instrumentTemplateUpdateMock.mockResolvedValue({ id: TEMPLATE_ID });
    transactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        instrumentTemplate: {
          findUnique: instrumentTemplateFindUniqueMock.mockResolvedValue({ program_id: PROGRAM_ID }),
          update: instrumentTemplateUpdateMock,
        },
      })
    );

    const result = await toggleTemplateActive(PROGRAM_ID, TEMPLATE_ID, false);

    expect(result).toEqual({ success: true, data: undefined });
    expect(instrumentTemplateUpdateMock).toHaveBeenCalledWith({
      where: { id: TEMPLATE_ID },
      data: { is_active: false },
    });
  });

  it("PH cannot toggle active on institutional baseline", async () => {
    instrumentTemplateFindUniqueMock.mockResolvedValue({
      id: "baseline-1",
      program_id: null,
    });

    const result = await toggleTemplateActive(PROGRAM_ID, "baseline-1", false);

    expect(result).toEqual({
      success: false,
      error: "Institutional baseline templates cannot be modified.",
    });
    expect(instrumentTemplateUpdateMock).not.toHaveBeenCalled();
  });

  // ─── toggleFacultyAccessible ───────────────────────────────────────

  it("PH can toggle faculty accessible", async () => {
    instrumentTemplateFindUniqueMock.mockResolvedValue({
      id: TEMPLATE_ID,
      program_id: PROGRAM_ID,
      template_type: "COURSE_BOUND",
    });
    instrumentTemplateUpdateMock.mockResolvedValue({ id: TEMPLATE_ID });
    transactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        instrumentTemplate: {
          findUnique: instrumentTemplateFindUniqueMock.mockResolvedValue({ program_id: PROGRAM_ID }),
          update: instrumentTemplateUpdateMock,
        },
      })
    );

    const result = await toggleFacultyAccessible(PROGRAM_ID, TEMPLATE_ID, true);

    expect(result).toEqual({ success: true, data: undefined });
    expect(instrumentTemplateUpdateMock).toHaveBeenCalledWith({
      where: { id: TEMPLATE_ID },
      data: { is_faculty_accessible: true },
    });
  });

  // ─── Unique constraint on code ─────────────────────────────────────

  it("returns error on unique constraint violation during create", async () => {
    programFindUniqueMock.mockResolvedValue({
      id: PROGRAM_ID,
      code: "BSIT",
    });

    transactionMock.mockRejectedValue(createPrismaUniqueConstraintError());

    const result = await createProgramHeadTemplate({
      programId: PROGRAM_ID,
      name: "Duplicate Template",
      template_type: EvaluationTemplateType.PROGRAM_WIDE,
      is_faculty_accessible: false,
      structure: VALID_STRUCTURE,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("already exists");
    }
  });

  // ─── Auth guards ─────────────────────────────────────────────────

  it("rejects unauthenticated requests", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Program Head authentication is required.",
    });

    const result = await createProgramHeadTemplate({
      programId: PROGRAM_ID,
      name: "Test",
      template_type: EvaluationTemplateType.PROGRAM_WIDE,
      is_faculty_accessible: false,
      structure: VALID_STRUCTURE,
    });

    expect(result).toEqual({
      success: false,
      error: "Program Head authentication is required.",
    });
  });

  it("rejects non-PROGRAM_HEAD role", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      ...PH_SESSION,
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
    });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Program Head authentication is required.",
    });

    const result = await createProgramHeadTemplate({
      programId: PROGRAM_ID,
      name: "Test",
      template_type: EvaluationTemplateType.PROGRAM_WIDE,
      is_faculty_accessible: false,
      structure: VALID_STRUCTURE,
    });

    expect(result).toEqual({
      success: false,
      error: "Program Head authentication is required.",
    });
  });
});

// ─── normalizePloQuestionBindings (pure) ─────────────────────────────────────

describe("normalizePloQuestionBindings", () => {
  const structure = [
    {
      key: "sec-1",
      title: "Outcomes",
      order: 0,
      questions: [
        { key: "q-1", prompt: "Prepared me for employment", type: "likert" as const, order: 0, required: true },
        { key: "q-2", prompt: "Recommend the program", type: "likert" as const, order: 1, required: true },
      ],
    },
    {
      key: "sec-2",
      title: "Open",
      order: 1,
      questions: [
        { key: "q-3", prompt: "Any comments?", type: "guided_open_ended" as const, order: 0, required: false },
      ],
    },
  ];

  const plos = [
    { id: "plo-1", code: "BSIT-GO1", description: "Communicate effectively" },
    { id: "plo-2", code: "BSIT-GO2", description: "Apply technical skills" },
  ];

  it("rejects bindings that target non-Likert questions", () => {
    const result = normalizePloQuestionBindings({
      bindings: [{ ploId: "plo-1", sectionKey: "sec-2", itemKey: "q-3" }],
      structure,
      plos,
    });

    expect(result).toEqual({
      success: false,
      error: "PLOs can only be assigned to Likert questions.",
    });
  });

  it("rejects bindings to unknown or inactive PLOs", () => {
    const result = normalizePloQuestionBindings({
      bindings: [{ ploId: "plo-ghost", sectionKey: "sec-1", itemKey: "q-1" }],
      structure,
      plos,
    });

    expect(result).toEqual({
      success: false,
      error: "One or more selected PLOs are invalid or no longer active.",
    });
  });

  it("rejects duplicate (question, PLO) pairs", () => {
    const result = normalizePloQuestionBindings({
      bindings: [
        { ploId: "plo-1", sectionKey: "sec-1", itemKey: "q-1" },
        { ploId: "plo-1", sectionKey: "sec-1", itemKey: "q-1" },
      ],
      structure,
      plos,
    });

    expect(result).toEqual({
      success: false,
      error: "Each Likert question can only be assigned to a PLO once.",
    });
  });

  it("treats keys containing separators as distinct questions, not collisions", () => {
    const trickyStructure = [
      {
        key: "a",
        title: "Tricky",
        order: 0,
        questions: [
          { key: "b:c", prompt: "Joined key question", type: "likert" as const, order: 0, required: true },
          { key: "q-1", prompt: "Plain key question", type: "likert" as const, order: 1, required: true },
        ],
      },
      {
        key: "a:b",
        title: "Joined section",
        order: 1,
        questions: [
          { key: "c", prompt: "Other join direction", type: "likert" as const, order: 0, required: true },
        ],
      },
    ];

    const result = normalizePloQuestionBindings({
      bindings: [{ ploId: "plo-1", sectionKey: "a:b", itemKey: "c" }],
      structure: trickyStructure,
      plos,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.bindings[0]?.questionPromptSnapshot).toBe("Other join direction");
      expect(JSON.parse(result.missingQuestionKeys[0]!)).toEqual(["a", "b:c"]);
    }
  });

  it("snapshots PLO code/description and question prompt, and reports unbound Likert questions", () => {
    const result = normalizePloQuestionBindings({
      bindings: [
        { ploId: "plo-1", sectionKey: "sec-1", itemKey: "q-1" },
        { ploId: "plo-2", sectionKey: "sec-1", itemKey: "q-1" },
      ],
      structure,
      plos,
    });

    expect(result).toEqual({
      success: true,
      bindings: [
        {
          ploCodeSnapshot: "BSIT-GO1",
          ploDescriptionSnapshot: "Communicate effectively",
          ploId: "plo-1",
          itemKey: "q-1",
          questionPromptSnapshot: "Prepared me for employment",
          sectionKey: "sec-1",
        },
        {
          ploCodeSnapshot: "BSIT-GO2",
          ploDescriptionSnapshot: "Apply technical skills",
          ploId: "plo-2",
          itemKey: "q-1",
          questionPromptSnapshot: "Prepared me for employment",
          sectionKey: "sec-1",
        },
      ],
      missingQuestionKeys: [JSON.stringify(["sec-1", "q-2"])],
    });
  });
});
