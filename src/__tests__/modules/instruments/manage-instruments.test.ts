import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvaluationTemplateType } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";

const {
  resolveAuthSessionMock,
  instrumentTemplateFindUniqueMock,
  instrumentTemplateUpdateMock,
  instrumentVersionCreateMock,
  transactionMock,
} = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  instrumentTemplateFindUniqueMock: vi.fn(),
  instrumentTemplateUpdateMock: vi.fn(),
  instrumentVersionCreateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    instrumentTemplate: {
      findUnique: instrumentTemplateFindUniqueMock,
    },
    $transaction: transactionMock,
  },
}));

describe("manage-instruments structure persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "secretary-1",
      email: "secretary@cloie.test",
      roles: [ROLES.SECRETARY],
      activeRole: ROLES.SECRETARY,
      studentProfileId: null,
      profileGate: null,
    });
    instrumentTemplateFindUniqueMock.mockResolvedValue({
      program_id: null,
      _count: { versions: 2 },
    });
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        instrumentTemplate: {
          update: instrumentTemplateUpdateMock.mockResolvedValue({ id: "baseline-1" }),
        },
        instrumentVersion: {
          create: instrumentVersionCreateMock.mockResolvedValue({ id: "version-3" }),
        },
      })
    );
  });

  it("writes the exact reordered structure to the baseline and next version snapshot", async () => {
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
    const { updateBaselineTemplateWithStructure } = await import(
      "@/features/instruments/services/manage-instruments"
    );

    const result = await updateBaselineTemplateWithStructure({
      id: "baseline-1",
      code: "COURSE_BOUND_EVAL",
      name: "Reordered Evaluation",
      description: "Updated baseline",
      template_type: EvaluationTemplateType.COURSE_BOUND,
      is_faculty_accessible: true,
      structure: reorderedStructure,
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(instrumentTemplateUpdateMock).toHaveBeenCalledWith({
      where: { id: "baseline-1" },
      data: expect.objectContaining({ structure: reorderedStructure }),
    });
    expect(instrumentVersionCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        template_id: "baseline-1",
        version_number: 3,
        structure_snapshot: reorderedStructure,
      }),
    });
  });

  it("rejects a non-secretary/dean session before persistence", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "student-1",
      email: "student@cloie.test",
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      studentProfileId: null,
      profileGate: null,
    });
    const { updateBaselineTemplateWithStructure } = await import(
      "@/features/instruments/services/manage-instruments"
    );

    const result = await updateBaselineTemplateWithStructure({
      id: "baseline-1",
      code: "COURSE_BOUND_EVAL",
      name: "Rejected",
      template_type: EvaluationTemplateType.COURSE_BOUND,
      is_faculty_accessible: true,
      structure: [],
    });

    expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
