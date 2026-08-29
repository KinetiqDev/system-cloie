import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveContextMock, findManyMock, programFindMock } = vi.hoisted(() => ({
  resolveContextMock: vi.fn(),
  findManyMock: vi.fn(),
  programFindMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveContextMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    program: { findUnique: programFindMock },
    pLO: { findMany: findManyMock },
  },
}));

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";

describe("previewPLOImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveContextMock.mockResolvedValue({
      success: true,
      data: { selectedProgram: { id: PROGRAM_ID, code: "BSIT", name: "Information Technology" } },
    });
    programFindMock.mockResolvedValue({ id: PROGRAM_ID, is_active: true });
    findManyMock.mockResolvedValue([
      { code: "PLO-2", is_active: true },
      { code: "PLO-3", is_active: false },
    ]);
  });

  it("classifies valid, invalid, repeated, active-existing, and archived-existing rows", async () => {
    const { previewPLOImport } = await import("@/features/outcomes/services/preview-plo-import");
    const result = await previewPLOImport({
      programId: PROGRAM_ID,
      rows: [
        { sourceIndex: 2, input: { plo_code: " plo-1 ", description: "Valid outcome" } },
        { sourceIndex: 3, input: { plo_code: "PLO-2", description: "Different text" } },
        { sourceIndex: 4, input: { plo_code: "PLO-3", description: "Archived code" } },
        { sourceIndex: 5, input: { plo_code: "dup", description: "First duplicate" } },
        { sourceIndex: 6, input: { plo_code: " DUP ", description: "Second duplicate" } },
        { sourceIndex: 7, input: { plo_code: "", description: "Missing code" } },
      ],
    });

    expect(result).toEqual({
      success: true,
      data: {
        summary: {
          total: 6,
          ready: 1,
          attention: 5,
          existing: 2,
          created: 0,
          notCreated: 0,
        },
        rows: [
          expect.objectContaining({ ploCode: "PLO-1", status: "READY", error: null }),
          expect.objectContaining({
            status: "DUPLICATE_EXISTING_ACTIVE",
            error: expect.stringContaining("already exists"),
          }),
          expect.objectContaining({
            status: "DUPLICATE_EXISTING_ARCHIVED",
            error: expect.stringContaining("archived"),
          }),
          expect.objectContaining({ status: "DUPLICATE_IN_FILE" }),
          expect.objectContaining({ status: "DUPLICATE_IN_FILE" }),
          expect.objectContaining({ status: "INVALID", error: "PLO code is required." }),
        ],
      },
    });
  });

  it("rejects an inactive selected Program", async () => {
    programFindMock.mockResolvedValue({ id: PROGRAM_ID, is_active: false });
    const { previewPLOImport } = await import("@/features/outcomes/services/preview-plo-import");
    await expect(
      previewPLOImport({
        programId: PROGRAM_ID,
        rows: [{ sourceIndex: 2, input: { plo_code: "PLO-1", description: "Valid outcome" } }],
      })
    ).resolves.toEqual({ success: false, error: "Active Academic Program is required." });
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
