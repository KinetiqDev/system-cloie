import { beforeEach, describe, expect, it, vi } from "vitest";

const { createGOMock, prepareOutcomeWriteMock, commitOutcomeWriteMock, revalidatePathMock } =
  vi.hoisted(() => ({
    createGOMock: vi.fn(),
    prepareOutcomeWriteMock: vi.fn(),
    commitOutcomeWriteMock: vi.fn(),
    revalidatePathMock: vi.fn(),
  }));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/features/outcomes/services/manage-program-head-outcomes", () => ({
  createGO: createGOMock,
  updateGO: vi.fn(),
  deleteGO: vi.fn(),
  reorderGOs: vi.fn(),
}));
vi.mock("@/features/outcomes/services/manage-outcome-writes", () => ({
  prepareOutcomeWrite: prepareOutcomeWriteMock,
  commitOutcomeWrite: commitOutcomeWriteMock,
}));

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";

describe("Program Head Outcome actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createGOMock.mockResolvedValue({ success: true, data: { id: "go-1" } });
    prepareOutcomeWriteMock.mockImplementation(async (input) => ({
      success: true,
      data: { input, before: null, after: null, freshnessToken: "fresh", signature: "aa" },
    }));
    commitOutcomeWriteMock.mockResolvedValue({ success: true, data: { id: "mapping-1" } });
  });

  it("revalidates only the selected canonical Outcome and mapping paths", async () => {
    const { createGOAction } = await import("@/lib/actions/program-head-outcome-actions");
    const formData = new FormData();
    formData.set("programId", PROGRAM_ID);
    formData.set("code", "GO-1");
    formData.set("description", "Critical thinking");

    await expect(createGOAction(formData)).resolves.toEqual({ success: true });
    expect(revalidatePathMock.mock.calls).toEqual([
      [`/program-head/programs/${PROGRAM_ID}/outcomes`],
      [`/program-head/programs/${PROGRAM_ID}/outcomes/mapping`],
    ]);
  });

  it("rejects a missing selected Program before invoking the write service", async () => {
    const { createGOAction } = await import("@/lib/actions/program-head-outcome-actions");
    const formData = new FormData();
    formData.set("code", "GO-1");
    formData.set("description", "Critical thinking");

    await expect(createGOAction(formData)).resolves.toMatchObject({ success: false });
    expect(createGOMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("revalidates selected paths for mapping actions", async () => {
    const { prepareMappingAction, prepareRemoveMappingAction, commitMappingAction } =
      await import("@/lib/actions/program-head-outcome-actions");
    const createData = new FormData();
    createData.set("programId", PROGRAM_ID);
    createData.set("ciloId", "22222222-2222-4222-8222-222222222222");
    createData.set("goId", "33333333-3333-4333-8333-333333333333");
    const removeData = new FormData();
    removeData.set("programId", PROGRAM_ID);
    removeData.set("id", "44444444-4444-4444-8444-444444444444");

    const createReview = await prepareMappingAction(createData);
    const removeReview = await prepareRemoveMappingAction(removeData);
    expect(createReview.success).toBe(true);
    expect(removeReview.success).toBe(true);
    await expect(
      commitMappingAction(createReview.success ? createReview.review : fail("create review"), true)
    ).resolves.toEqual({ success: true });
    await expect(
      commitMappingAction(removeReview.success ? removeReview.review : fail("remove review"), true)
    ).resolves.toEqual({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledTimes(4);
    expect(prepareOutcomeWriteMock).toHaveBeenCalledWith({
      kind: "MAPPING",
      action: "create",
      programId: PROGRAM_ID,
      ciloId: "22222222-2222-4222-8222-222222222222",
      goId: "33333333-3333-4333-8333-333333333333",
    });
  });

  it("rejects malformed mapping reviews without opening a write", async () => {
    const { commitMappingAction } = await import("@/lib/actions/program-head-outcome-actions");

    await expect(commitMappingAction(null, true)).resolves.toEqual({
      success: false,
      error: "Invalid mapping review.",
    });
    await expect(commitMappingAction({}, true)).resolves.toEqual({
      success: false,
      error: "Invalid mapping review.",
    });
    expect(commitOutcomeWriteMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

function fail(message: string): never {
  throw new Error(message);
}
