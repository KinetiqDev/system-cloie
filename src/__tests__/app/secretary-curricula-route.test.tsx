import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const REDIRECT_ERROR = "NEXT_REDIRECT";
const { redirectMock, resolveAuthSessionMock, listDataMock, versionListMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`${REDIRECT_ERROR}:${path}`);
  }),
  resolveAuthSessionMock: vi.fn(),
  listDataMock: vi.fn(),
  versionListMock: vi.fn(() => null),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/curriculum/services/read-curriculum-pages", () => ({
  listSecretaryCurriculumPageData: listDataMock,
}));
vi.mock("@/features/curriculum/components/curriculum-version-list", () => ({
  CurriculumVersionList: versionListMock,
}));

describe("Secretary Curricula route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "secretary-1",
      roles: [ROLES.SECRETARY],
      activeRole: ROLES.SECRETARY,
      profileGate: { status: "COMPLETE" },
    });
    listDataMock.mockResolvedValue({
      programs: [],
      curricula: [],
      courses: [],
      schoolYears: [],
    });
  });

  async function loadPage() {
    return (await import("../../app/(app)/secretary/curricula/page")).default;
  }

  it("redirects a non-Secretary before loading curriculum data", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "dean-1",
      roles: [ROLES.DEAN],
      activeRole: ROLES.DEAN,
      profileGate: { status: "COMPLETE" },
    });

    const Page = await loadPage();
    await expect(Page()).rejects.toThrow(`${REDIRECT_ERROR}:/dashboard`);
    expect(listDataMock).not.toHaveBeenCalled();
  });

  it("passes Secretary page data into the client version list", async () => {
    const data = {
      programs: [{ id: "prog-1", code: "BSIT", name: "BS Information Technology" }],
      curricula: [],
      courses: [],
      schoolYears: [],
    };
    listDataMock.mockResolvedValue(data);

    const Page = await loadPage();
    const rendered = await Page();

    expect(rendered).toMatchObject({ props: data });
  });
});
