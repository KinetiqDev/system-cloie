import { describe, expect, it, vi } from "vitest";

const { notFoundMock, listDataMock, versionListMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  listDataMock: vi.fn(),
  versionListMock: vi.fn(() => null),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/curriculum/services/read-curriculum-pages", () => ({
  listProgramHeadCurriculumPageData: listDataMock,
}));
vi.mock("@/features/curriculum/components/curriculum-version-list", () => ({
  CurriculumVersionList: versionListMock,
}));

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";

describe("selected Program Curricula route", () => {
  it("passes the scoped program curricula into the client version list", async () => {
    const program = { id: PROGRAM_ID, code: "BSIT", name: "BS Information Technology" };
    listDataMock.mockResolvedValue({
      success: true,
      data: {
        program,
        schoolYears: [{ id: "year-1", code: "2025-2026" }],
      },
    });
    const Page = (await import("../../app/(app)/program-head/programs/[programId]/curricula/page"))
      .default;

    const rendered = await Page({ params: Promise.resolve({ programId: PROGRAM_ID }) });

    expect(listDataMock).toHaveBeenCalledWith(PROGRAM_ID);
    expect(rendered).toMatchObject({
      props: {
        programs: [program],
        schoolYears: [{ id: "year-1", code: "2025-2026" }],
        defaultProgramId: PROGRAM_ID,
      },
    });
  });

  it("does not render curricula when the selected program is not assigned", async () => {
    listDataMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });
    const Page = (await import("../../app/(app)/program-head/programs/[programId]/curricula/page"))
      .default;

    await expect(Page({ params: Promise.resolve({ programId: PROGRAM_ID }) })).rejects.toThrow(
      "NOT_FOUND"
    );
    expect(notFoundMock).toHaveBeenCalled();
  });
});
