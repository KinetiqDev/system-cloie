import { beforeEach, describe, expect, it, vi } from "vitest";

const { createGOMock, restoreGOMock, revalidatePathMock } = vi.hoisted(() => ({
  createGOMock: vi.fn(),
  restoreGOMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/features/outcomes/services/manage-program-head-outcomes", () => ({
  createGO: createGOMock,
  updateGO: vi.fn(),
  deleteGO: vi.fn(),
  reorderGOs: vi.fn(),
  restoreGO: restoreGOMock,
}));

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";

describe("Program Head Outcome actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createGOMock.mockResolvedValue({ success: true, data: { id: "go-1" } });
    restoreGOMock.mockResolvedValue({ success: true, data: undefined });
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

  it("exposes no Program Head mapping mutation actions", async () => {
    const actions = await import("@/lib/actions/program-head-outcome-actions");

    expect(actions).not.toHaveProperty("prepareMappingAction");
    expect(actions).not.toHaveProperty("commitMappingAction");
    expect(actions).not.toHaveProperty("prepareRemoveMappingAction");
  });

  it("restores an archived GO and revalidates the selected paths", async () => {
    const { restoreGOAction } = await import("@/lib/actions/program-head-outcome-actions");

    await expect(
      restoreGOAction(PROGRAM_ID, "22222222-2222-4222-8222-222222222222")
    ).resolves.toEqual({ success: true });
    expect(restoreGOMock).toHaveBeenCalledWith(PROGRAM_ID, "22222222-2222-4222-8222-222222222222");
    expect(revalidatePathMock.mock.calls).toEqual([
      [`/program-head/programs/${PROGRAM_ID}/outcomes`],
      [`/program-head/programs/${PROGRAM_ID}/outcomes/mapping`],
    ]);
  });
});
