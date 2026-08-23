import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveProgramHeadContextMock, loadResponsesPageMock, notFoundMock } = vi.hoisted(() => ({
  resolveProgramHeadContextMock: vi.fn(),
  loadResponsesPageMock: vi.fn(),
  notFoundMock: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({ resolveProgramHeadContext: resolveProgramHeadContextMock }));
vi.mock("@/features/analytics/services/load-program-head-responses-page", () => ({ loadProgramHeadResponsesPage: loadResponsesPageMock }));
vi.mock("@/features/analytics/components/program-head-responses-landing", () => ({
  ProgramHeadResponsesLanding: (props: { programId: string }) => <div>Responses for {props.programId}</div>,
}));

describe("Program Head Responses route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: { selectedProgram: { id: "program-1", code: "BSED", name: "Education" } },
    });
    loadResponsesPageMock.mockResolvedValue({
      state: { tab: "course", page: 1 },
      data: { items: [], total: 0, page: 1, pageSize: 20, options: { periodOptions: { schoolYears: [], semesters: [], termInstances: [] }, courses: [], faculty: [], majors: [], instruments: [] } },
    });
  });

  it("passes the path Program ID to the authorized loader, ignoring query Program IDs", async () => {
    const Page = (await import("../../app/(app)/program-head/programs/[programId]/responses/page")).default;
    await Page({ params: Promise.resolve({ programId: "program-1" }), searchParams: Promise.resolve({ programId: "program-2", q: "faculty" }) });
    expect(resolveProgramHeadContextMock).toHaveBeenCalledWith("program-1");
    expect(loadResponsesPageMock).toHaveBeenCalledWith({ programId: "program-1", rawSearchParams: { programId: "program-2", q: "faculty" } });
  });

  it("fails closed before loading response data for an unauthorized Program", async () => {
    resolveProgramHeadContextMock.mockResolvedValueOnce({ success: false, error: "Selected Program is not assigned." });
    const Page = (await import("../../app/(app)/program-head/programs/[programId]/responses/page")).default;
    await expect(Page({ params: Promise.resolve({ programId: "program-2" }), searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(loadResponsesPageMock).not.toHaveBeenCalled();
  });
});
