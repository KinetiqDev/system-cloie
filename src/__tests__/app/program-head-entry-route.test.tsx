import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock, resolveEntryMock, readSelectedProgramCookieMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
  resolveEntryMock: vi.fn(),
  readSelectedProgramCookieMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({ resolveProgramHeadEntry: resolveEntryMock }));
vi.mock("@/features/auth/services/selected-program-cookie", () => ({
  readSelectedProgramCookie: readSelectedProgramCookieMock,
}));
describe("Program Head entry route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the actionable empty state for zero assignments", async () => {
    resolveEntryMock.mockResolvedValue({ success: true, data: { userId: "user-1", authorizedPrograms: [] } });
    const Page = await loadPage();
    await expect(Page()).resolves.toBeDefined();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects one assignment to its canonical dashboard", async () => {
    resolveEntryMock.mockResolvedValue({ success: true, data: { userId: "user-1", authorizedPrograms: [{ id: "program-1", code: "BEED", name: "Elementary Education" }] } });
    const Page = await loadPage();
    await expect(Promise.resolve().then(() => Page())).rejects.toThrow(
      "REDIRECT:/program-head/programs/program-1/dashboard"
    );
  });

  it("renders a selector without selecting a Program for multiple assignments when no valid cookie exists", async () => {
    readSelectedProgramCookieMock.mockResolvedValue(null);
    resolveEntryMock.mockResolvedValue({ success: true, data: { userId: "user-1", authorizedPrograms: [{ id: "program-1", code: "BEED", name: "Elementary Education" }, { id: "program-2", code: "BSED", name: "Secondary Education" }] } });
    const Page = await loadPage();
    await expect(Page()).resolves.toBeDefined();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to the remembered program dashboard when a valid cookie exists for multiple assignments", async () => {
    readSelectedProgramCookieMock.mockResolvedValue("program-2");
    resolveEntryMock.mockResolvedValue({ success: true, data: { userId: "user-1", authorizedPrograms: [{ id: "program-1", code: "BEED", name: "Elementary Education" }, { id: "program-2", code: "BSED", name: "Secondary Education" }] } });
    const Page = await loadPage();
    await expect(Promise.resolve().then(() => Page())).rejects.toThrow(
      "REDIRECT:/program-head/programs/program-2/dashboard"
    );
  });
});
async function loadPage() {
  const { default: Page } = await import("@/app/(app)/program-head/page");
  return Page;
}
