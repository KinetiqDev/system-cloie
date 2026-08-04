import { beforeEach, describe, expect, it, vi } from "vitest";

const { contextMock, assignmentMock, transactionMock, templateCreateMock, versionCreateMock, programMock } = vi.hoisted(() => ({
  contextMock: vi.fn(),
  assignmentMock: vi.fn(),
  transactionMock: vi.fn(),
  templateCreateMock: vi.fn(),
  versionCreateMock: vi.fn(),
  programMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: contextMock,
  revalidateProgramHeadAssignment: assignmentMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    instrumentTemplate: { findUnique: vi.fn().mockResolvedValue({
      id: "baseline-1",
      code: "CENTRAL",
      name: "Central",
      description: null,
      template_type: "PROGRAM_WIDE",
      is_faculty_accessible: false,
      structure: [],
      faculty_owner_id: null,
      program_id: null,
    }) },
    program: { findUnique: programMock },
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
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        instrumentTemplate: { create: templateCreateMock.mockResolvedValue({ id: "copy-1" }) },
        instrumentVersion: { create: versionCreateMock.mockResolvedValue({ id: "version-1" }) },
      })
    );
  });

  it("creates the institutional baseline copy in the selected Program", async () => {
    const { createBaselineCopy } = await import("@/features/instruments/services/create-baseline-copy");
    const result = await createBaselineCopy({
      programId: "program-2",
      baselineId: "baseline-1",
      customName: "BSED Copy",
      structure: [],
    });

    expect(result).toEqual({ success: true, data: { id: "copy-1" } });
    expect(templateCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ program_id: "program-2", source_template_id: "baseline-1" }),
    });
  });

  it("does not create a copy when the selected context is rejected", async () => {
    contextMock.mockResolvedValue({ success: false, error: "Selected Program is not assigned." });
    const { createBaselineCopy } = await import("@/features/instruments/services/create-baseline-copy");
    const result = await createBaselineCopy({ programId: "program-3", baselineId: "baseline-1", customName: "Copy", structure: [] });

    expect(result.success).toBe(false);
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
