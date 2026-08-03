import { describe, expect, it, vi } from "vitest";

const { notFoundMock, listCoursesMock, catalogMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => { throw new Error("NOT_FOUND"); }),
  listCoursesMock: vi.fn(),
  catalogMock: vi.fn(() => null),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/academic-structure/services/resolve-program-head-courses", () => ({
  listProgramHeadCourses: listCoursesMock,
}));
vi.mock("@/features/academic-structure/components/program-head-courses-catalog", () => ({
  ProgramHeadCoursesCatalog: catalogMock,
}));

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";

describe("selected Program Courses route", () => {
  it("passes the route Program to the scoped Course read and catalog", async () => {
    const program = { id: PROGRAM_ID, code: "BSED", name: "Secondary Education" };
    listCoursesMock.mockResolvedValue({
      success: true,
      data: { courses: [], summary: {}, program, programs: [program], majors: [] },
    });
    const Page = (await import("@/app/(app)/program-head/programs/[programId]/courses/page")).default;

    const rendered = await Page({ params: Promise.resolve({ programId: PROGRAM_ID }) });
    expect(listCoursesMock).toHaveBeenCalledWith(PROGRAM_ID);
    expect(rendered).toMatchObject({ props: { program } });
  });

  it("does not render Course data when the selected route is unavailable", async () => {
    listCoursesMock.mockResolvedValue({ success: false, error: "Selected Program is not assigned." });
    const Page = (await import("@/app/(app)/program-head/programs/[programId]/courses/page")).default;

    await expect(Page({ params: Promise.resolve({ programId: PROGRAM_ID }) })).rejects.toThrow("NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
    expect(catalogMock).not.toHaveBeenCalled();
  });
});
