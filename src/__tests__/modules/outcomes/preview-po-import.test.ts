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
    pO: { findMany: findManyMock },
  },
}));

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";

describe("previewPOImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveContextMock.mockResolvedValue({
      success: true,
      data: { selectedProgram: { id: PROGRAM_ID, code: "BSIT", name: "Information Technology" } },
    });
    programFindMock.mockResolvedValue({ id: PROGRAM_ID, is_active: true });
    findManyMock.mockResolvedValue([
      { code: "PO-2", is_active: true },
      { code: "PO-3", is_active: false },
    ]);
  });

  it("classifies valid, invalid, repeated, active-existing, and archived-existing rows", async () => {
    const { previewPOImport } = await import("@/features/outcomes/services/preview-po-import");
    const result = await previewPOImport({
      programId: PROGRAM_ID,
      rows: [
        { sourceIndex: 2, input: { po_code: " po-1 ", description: "Valid outcome" } },
        { sourceIndex: 3, input: { po_code: "PO-2", description: "Different text" } },
        { sourceIndex: 4, input: { po_code: "PO-3", description: "Archived code" } },
        { sourceIndex: 5, input: { po_code: "dup", description: "First duplicate" } },
        { sourceIndex: 6, input: { po_code: " DUP ", description: "Second duplicate" } },
        { sourceIndex: 7, input: { po_code: "", description: "Missing code" } },
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
          expect.objectContaining({ poCode: "PO-1", status: "READY", error: null }),
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
          expect.objectContaining({ status: "INVALID", error: "PO code is required." }),
        ],
      },
    });
  });

  it("rejects an inactive selected Program", async () => {
    programFindMock.mockResolvedValue({ id: PROGRAM_ID, is_active: false });
    const { previewPOImport } = await import("@/features/outcomes/services/preview-po-import");
    await expect(
      previewPOImport({
        programId: PROGRAM_ID,
        rows: [{ sourceIndex: 2, input: { po_code: "PO-1", description: "Valid outcome" } }],
      })
    ).resolves.toEqual({ success: false, error: "Active Academic Program is required." });
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
