import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  previewMock,
  resolveContextMock,
  revalidateAssignmentMock,
  transactionMock,
  programFindMock,
  ploFindManyMock,
  createManyMock,
} = vi.hoisted(() => ({
  previewMock: vi.fn(),
  resolveContextMock: vi.fn(),
  revalidateAssignmentMock: vi.fn(),
  transactionMock: vi.fn(),
  programFindMock: vi.fn(),
  ploFindManyMock: vi.fn(),
  createManyMock: vi.fn(),
}));

vi.mock("@/features/outcomes/services/preview-plo-import", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/outcomes/services/preview-plo-import")>()),
  previewPLOImport: previewMock,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveContextMock,
  revalidateProgramHeadAssignment: revalidateAssignmentMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: { $transaction: transactionMock } }));

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";
const request = {
  programId: PROGRAM_ID,
  rows: [
    { sourceIndex: 2, input: { plo_code: "PLO-1", description: "First outcome" } },
    { sourceIndex: 3, input: { plo_code: "PLO-2", description: "Second outcome" } },
  ],
};

function readyRow(sourceIndex: number, ploCode: string, description: string) {
  return {
    sourceIndex,
    input: { plo_code: ploCode, description },
    ploCode,
    description,
    status: "READY" as const,
    error: null,
  };
}

describe("confirmPLOImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveContextMock.mockResolvedValue({
      success: true,
      data: { userId: "ph-1", selectedProgram: { id: PROGRAM_ID } },
    });
    previewMock.mockResolvedValue({
      success: true,
      data: {
        rows: [readyRow(2, "PLO-1", "First outcome"), readyRow(3, "PLO-2", "Second outcome")],
        summary: {
          total: 2,
          ready: 2,
          attention: 0,
          existing: 0,
          created: 0,
          notCreated: 0,
        },
      },
    });
    revalidateAssignmentMock.mockResolvedValue({ id: PROGRAM_ID });
    programFindMock.mockResolvedValue({ is_active: true });
    ploFindManyMock.mockResolvedValue([{ code: "OLD", order: 4, is_active: true }]);
    createManyMock.mockResolvedValue({ count: 2 });
    transactionMock.mockImplementation(async (callback) =>
      callback({
        programHeadAssignment: { findFirst: vi.fn() },
        program: { findUnique: programFindMock },
        pLO: { findMany: ploFindManyMock, createMany: createManyMock },
      })
    );
  });

  it("atomically appends ready PLOs in file order", async () => {
    const { confirmPLOImport } = await import("@/features/outcomes/services/confirm-plo-import");
    const result = await confirmPLOImport(request);

    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        { code: "PLO-1", description: "First outcome", order: 5, program_id: PROGRAM_ID },
        { code: "PLO-2", description: "Second outcome", order: 6, program_id: PROGRAM_ID },
      ],
    });
    expect(result).toEqual({
      success: true,
      data: {
        rows: [
          expect.objectContaining({ outcome: "CREATED", ploCode: "PLO-1" }),
          expect.objectContaining({ outcome: "CREATED", ploCode: "PLO-2" }),
        ],
        summary: {
          total: 2,
          ready: 0,
          attention: 0,
          existing: 0,
          created: 2,
          notCreated: 0,
        },
      },
    });
  });

  it("reclassifies a code created after preview without updating it", async () => {
    ploFindManyMock.mockResolvedValue([
      { code: "OLD", order: 4, is_active: true },
      { code: "PLO-2", order: 5, is_active: false },
    ]);
    createManyMock.mockResolvedValue({ count: 1 });
    const { confirmPLOImport } = await import("@/features/outcomes/services/confirm-plo-import");
    const result = await confirmPLOImport(request);

    expect(createManyMock).toHaveBeenCalledWith({
      data: [{ code: "PLO-1", description: "First outcome", order: 6, program_id: PROGRAM_ID }],
    });
    expect(result).toMatchObject({
      success: true,
      data: {
        rows: [{ outcome: "CREATED" }, { outcome: "DUPLICATE_EXISTING_ARCHIVED" }],
        summary: { created: 1, notCreated: 1 },
      },
    });
  });

  it("creates nothing when Program authority is lost before confirmation", async () => {
    revalidateAssignmentMock.mockResolvedValue(null);
    const { confirmPLOImport } = await import("@/features/outcomes/services/confirm-plo-import");
    await expect(confirmPLOImport(request)).resolves.toEqual({
      success: false,
      error: "You do not have permission to import Program Learning Outcomes for this Program.",
    });
    expect(createManyMock).not.toHaveBeenCalled();
  });
  it("treats whitespace-equivalent codes created after preview as existing", async () => {
    ploFindManyMock.mockResolvedValue([{ code: "AB  C", order: 4, is_active: true }]);
    previewMock.mockResolvedValue({
      success: true,
      data: {
        rows: [readyRow(2, "AB C", "Collapsed code")],
        summary: { total: 1, ready: 1, attention: 0, existing: 0, created: 0, notCreated: 0 },
      },
    });
    const { confirmPLOImport } = await import("@/features/outcomes/services/confirm-plo-import");
    const result = await confirmPLOImport({
      programId: PROGRAM_ID,
      rows: [{ sourceIndex: 2, input: { plo_code: "AB C", description: "Collapsed code" } }],
    });

    expect(createManyMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      data: {
        rows: [{ outcome: "DUPLICATE_EXISTING_ACTIVE" }],
        summary: { created: 0, notCreated: 1 },
      },
    });
  });

  it("reports no not-processed rows because confirmation is atomic", async () => {
    const { confirmPLOImport } = await import("@/features/outcomes/services/confirm-plo-import");
    const result = await confirmPLOImport(request);
    expect(result.success && result.data.summary).toEqual({
      total: 2,
      ready: 0,
      attention: 0,
      existing: 0,
      created: 2,
      notCreated: 0,
    });
  });
});
