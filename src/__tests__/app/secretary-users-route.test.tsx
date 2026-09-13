import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentSection, YearLevel } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";

const REDIRECT_ERROR = "NEXT_REDIRECT";
const { redirectMock, resolveAuthSessionMock, listSummaryMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`${REDIRECT_ERROR}:${path}`);
  }),
  resolveAuthSessionMock: vi.fn(),
  listSummaryMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/users/services/list-secretary-users-summary", () => ({
  listSecretaryUsersSummary: listSummaryMock,
}));
vi.mock("@/features/users/components/secretary-users-list/index", () => ({
  SecretaryUsersList: () => null,
}));

describe("Secretary Users route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "secretary-1",
      roles: [ROLES.SECRETARY],
      activeRole: ROLES.SECRETARY,
      profileGate: { status: "COMPLETE" },
    });
    listSummaryMock.mockResolvedValue({
      success: true,
      data: {
        users: [],
        total: 0,
        page: 1,
        pageSize: 15,
        kpi: { totalUsers: 0, totalStudents: 0, totalAlumni: 0, totalIndustryPartners: 0 },
        programs: [],
        yearLevels: [],
        activePeriod: null,
      },
    });
  });

  async function loadPage() {
    return (await import("../../app/(app)/secretary/users/page")).default;
  }

  it("denies a non-Secretary active role before loading user data", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "dean-1",
      roles: [ROLES.SECRETARY, ROLES.DEAN],
      activeRole: ROLES.DEAN,
      profileGate: { status: "COMPLETE" },
    });

    const Page = await loadPage();
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      `${REDIRECT_ERROR}:/unauthorized`
    );
    expect(listSummaryMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ unknown: "ignored" }, "/secretary/users"],
    [{ page: ["2", "3"] }, "/secretary/users?page=2"],
    [{ role: "NOT_A_ROLE", sort: "createdAt" }, "/secretary/users"],
    [{ page: "10001" }, "/secretary/users"],
    [{ page: "1", sort: "name", dir: "asc" }, "/secretary/users"],
    // Legacy first/last sort bookmarks canonicalize to complete-name default.
    [{ sort: "firstName" }, "/secretary/users"],
    [{ sort: "lastName" }, "/secretary/users"],
    [{ sort: "lastName", dir: "desc" }, "/secretary/users?sort=name&dir=desc"],
    // Student placement filters canonicalize to their enum spellings.
    [
      { role: "STUDENT", yearLevel: "3rd Year", section: "morning" },
      "/secretary/users?role=STUDENT&yearLevel=THIRD_YEAR&section=MORNING",
    ],
    // Transient toast params are carried across canonicalization redirects.
    [
      { sort: "lastName", toast: "Failed", toastType: "error" },
      "/secretary/users?toast=Failed&toastType=error",
    ],
    [
      { page: ["2", "3"], toast: "Saved", toastType: "success" },
      "/secretary/users?page=2&toast=Saved&toastType=success",
    ],
  ])("redirects non-canonical list URLs %#", async (rawParams, expectedPath) => {
    const Page = await loadPage();
    await expect(Page({ searchParams: Promise.resolve(rawParams) })).rejects.toThrow(
      `${REDIRECT_ERROR}:${expectedPath}`
    );
    expect(listSummaryMock).not.toHaveBeenCalled();
  });

  it("renders when only transient toast params are present", async () => {
    const Page = await loadPage();
    await Page({
      searchParams: Promise.resolve({
        toast: "User created successfully.",
        toastType: "success",
      }),
    });

    expect(listSummaryMock).toHaveBeenCalledTimes(1);
  });

  it("passes canonical server list state to the read service", async () => {
    listSummaryMock.mockResolvedValueOnce({
      success: true,
      data: {
        users: [],
        total: 16,
        page: 2,
        pageSize: 15,
        kpi: { totalUsers: 16, totalStudents: 16, totalAlumni: 0, totalIndustryPartners: 0 },
        programs: [],
        yearLevels: [],
      },
    });
    const Page = await loadPage();
    await Page({
      searchParams: Promise.resolve({
        page: "2",
        role: ROLES.STUDENT,
        program: "BSCE",
        q: "Jane",
        sort: "email",
        dir: "desc",
      }),
    });

    expect(listSummaryMock).toHaveBeenCalledWith({
      page: 2,
      role: ROLES.STUDENT,
      program: "BSCE",
      q: "Jane",
      sort: "email",
      direction: "desc",
    });
  });

  it("passes Student placement filters to the read service", async () => {
    const Page = await loadPage();
    await Page({
      searchParams: Promise.resolve({
        role: ROLES.STUDENT,
        program: "BSBA",
        major: "Marketing Management",
        yearLevel: "THIRD_YEAR",
        section: "MORNING",
      }),
    });

    expect(listSummaryMock).toHaveBeenCalledWith({
      page: 1,
      role: ROLES.STUDENT,
      program: "BSBA",
      major: "Marketing Management",
      yearLevel: YearLevel.THIRD_YEAR,
      section: StudentSection.MORNING,
      sort: "name",
      direction: "asc",
    });
  });

  it("redirects placement filters the read service dropped to the canonical URL", async () => {
    listSummaryMock.mockResolvedValueOnce({
      success: false,
      error: "Invalid Secretary Users filters.",
      canonicalQuery: "role=STUDENT",
    });
    const Page = await loadPage();

    await expect(
      Page({ searchParams: Promise.resolve({ role: "STUDENT", yearLevel: "THIRD_YEAR" }) })
    ).rejects.toThrow(`${REDIRECT_ERROR}:/secretary/users?role=STUDENT`);
  });

  it("redirects a page beyond filtered results to the service's canonical page", async () => {
    listSummaryMock.mockResolvedValue({
      success: true,
      data: {
        users: [],
        total: 16,
        page: 2,
        pageSize: 15,
        kpi: { totalUsers: 16, totalStudents: 16, totalAlumni: 0, totalIndustryPartners: 0 },
        programs: [],
        yearLevels: [],
        activePeriod: null,
      },
    });
    const Page = await loadPage();

    await expect(Page({ searchParams: Promise.resolve({ page: "99" }) })).rejects.toThrow(
      `${REDIRECT_ERROR}:/secretary/users?page=2`
    );
  });
});
