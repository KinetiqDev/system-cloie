import { describe, expect, it, vi } from "vitest";

const { notFoundMock, listGOsMock, listMappingsMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  listGOsMock: vi.fn(),
  listMappingsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/outcomes/services/manage-program-head-outcomes", () => ({
  listProgramGOs: listGOsMock,
  listCILOMappingsForProgram: listMappingsMock,
}));

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";

describe("selected Program Outcome routes", () => {
  it("passes the route Program to the Outcome read", async () => {
    listGOsMock.mockResolvedValue({
      success: true,
      data: { gos: [], program: { id: PROGRAM_ID, code: "BSED", name: "Secondary Education" } },
    });
    const Page = (await import("@/app/(app)/program-head/programs/[programId]/outcomes/page"))
      .default;

    await Page({ params: Promise.resolve({ programId: PROGRAM_ID }) });

    expect(listGOsMock).toHaveBeenCalledWith(PROGRAM_ID);
  });

  it("does not render mapping data when the selected route is unavailable", async () => {
    listMappingsMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });
    const Page = (
      await import("@/app/(app)/program-head/programs/[programId]/outcomes/mapping/page")
    ).default;

    await expect(Page({ params: Promise.resolve({ programId: PROGRAM_ID }) })).rejects.toThrow(
      "NOT_FOUND"
    );
    expect(notFoundMock).toHaveBeenCalled();
  });
});
