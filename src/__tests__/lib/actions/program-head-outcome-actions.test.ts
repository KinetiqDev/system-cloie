import { beforeEach, describe, expect, it, vi } from "vitest";

const { createPOMock, restorePOMock, revalidatePathMock } = vi.hoisted(() => ({
  createPOMock: vi.fn(),
  restorePOMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/features/outcomes/services/manage-program-head-outcomes", () => ({
  createPO: createPOMock,
  updatePO: vi.fn(),
  deletePO: vi.fn(),
  reorderPOs: vi.fn(),
  restorePO: restorePOMock,
}));

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";

describe("Program Head Outcome actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createPOMock.mockResolvedValue({ success: true, data: { id: "po-1" } });
    restorePOMock.mockResolvedValue({ success: true, data: undefined });
  });

  it("revalidates only the selected canonical Outcome and mapping paths", async () => {
    const { createPOAction } = await import("@/lib/actions/program-head-outcome-actions");
    const formData = new FormData();
    formData.set("programId", PROGRAM_ID);
    formData.set("code", "PO-1");
    formData.set("description", "Critical thinking");

    await expect(createPOAction(formData)).resolves.toEqual({ success: true });
    expect(revalidatePathMock.mock.calls).toEqual([
      [`/program-head/programs/${PROGRAM_ID}/outcomes`],
      [`/program-head/programs/${PROGRAM_ID}/outcomes/mapping`],
    ]);
  });

  it("rejects a missing selected Program before invoking the write service", async () => {
    const { createPOAction } = await import("@/lib/actions/program-head-outcome-actions");
    const formData = new FormData();
    formData.set("code", "PO-1");
    formData.set("description", "Critical thinking");

    await expect(createPOAction(formData)).resolves.toMatchObject({ success: false });
    expect(createPOMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("exposes no Program Head mapping mutation actions", async () => {
    const actions = await import("@/lib/actions/program-head-outcome-actions");

    expect(actions).not.toHaveProperty("prepareMappingAction");
    expect(actions).not.toHaveProperty("commitMappingAction");
    expect(actions).not.toHaveProperty("prepareRemoveMappingAction");
  });

  it("restores an archived PO and revalidates the selected paths", async () => {
    const { restorePOAction } = await import("@/lib/actions/program-head-outcome-actions");

    await expect(
      restorePOAction(PROGRAM_ID, "22222222-2222-4222-8222-222222222222")
    ).resolves.toEqual({ success: true });
    expect(restorePOMock).toHaveBeenCalledWith(PROGRAM_ID, "22222222-2222-4222-8222-222222222222");
    expect(revalidatePathMock.mock.calls).toEqual([
      [`/program-head/programs/${PROGRAM_ID}/outcomes`],
      [`/program-head/programs/${PROGRAM_ID}/outcomes/mapping`],
    ]);
  });
});
