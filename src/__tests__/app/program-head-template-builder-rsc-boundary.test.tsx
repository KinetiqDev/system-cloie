import { beforeEach, describe, expect, it, vi } from "vitest";

const { getProgramHeadTemplateMock, notFoundMock, resolveProgramHeadContextMock } = vi.hoisted(() => ({
  getProgramHeadTemplateMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  resolveProgramHeadContextMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/instruments/services/manage-program-head-templates", () => ({
  getProgramHeadTemplate: getProgramHeadTemplateMock,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

const PROGRAM_ID = "8b69c52b-918f-43db-864b-d5cb09d3b4e8";
const BASELINE_ID = "40aaf343-60ca-48a4-ad6d-9a6510313bd7";

describe("selected Program template edit route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProgramHeadTemplateMock.mockResolvedValue({
      success: true,
      data: {
        program: { code: "BSIT", name: "Bachelor of Science in Information Technology" },
        template: {
          id: BASELINE_ID,
          name: "Institutional baseline",
          description: null,
          template_type: "PROGRAM_WIDE",
          is_active: true,
          is_faculty_accessible: false,
          program_id: null,
          structure: [],
        },
      },
    });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        selectedProgram: { code: "BSIT", id: PROGRAM_ID, name: "Bachelor of Science in Information Technology" },
      },
    });
  });

  it("passes only serializable data to the client builder for an institutional baseline", async () => {
    const Page = await loadPage();

    const page = await Page({ params: Promise.resolve({ id: BASELINE_ID, programId: PROGRAM_ID }) });

    expect(getProgramHeadTemplateMock).toHaveBeenCalledWith(PROGRAM_ID, BASELINE_ID);
    expect(page.props).toMatchObject({
      isInstitutionalBaseline: true,
      programId: PROGRAM_ID,
    });
    expect(page.props).not.toHaveProperty("onSave");
  });

  it("passes only serializable data to the client builder for a new template", async () => {
    const Page = await loadNewPage();

    const page = await Page({ params: Promise.resolve({ programId: PROGRAM_ID }) });

    expect(resolveProgramHeadContextMock).toHaveBeenCalledWith(PROGRAM_ID);
    expect(page.props).toMatchObject({ programId: PROGRAM_ID });
    expect(page.props).not.toHaveProperty("onSave");
  });
});

async function loadPage() {
  const { default: Page } = await import(
    "@/app/(app)/program-head/programs/[programId]/tools/[id]/edit/page"
  );
  return Page;
}

async function loadNewPage() {
  const { default: Page } = await import(
    "@/app/(app)/program-head/programs/[programId]/tools/new/page"
  );
  return Page;
}
