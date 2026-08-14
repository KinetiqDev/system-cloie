import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const REDIRECT_ERROR = "NEXT_REDIRECT";
const {
  redirectMock,
  resolveAuthSessionMock,
  listOutcomesMock,
  listSummariesMock,
  catalogPageMock,
  administrationListMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`${REDIRECT_ERROR}:${path}`);
  }),
  resolveAuthSessionMock: vi.fn(),
  listOutcomesMock: vi.fn(),
  listSummariesMock: vi.fn(),
  catalogPageMock: vi.fn((props: unknown) => props),
  administrationListMock: vi.fn((props: unknown) => props),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/outcomes/services/manage-institutional-outcomes", () => ({
  listInstitutionalOutcomes: listOutcomesMock,
}));
vi.mock("@/features/outcomes/services/manage-course-alignment", () => ({
  listCourseAlignmentSummaries: listSummariesMock,
}));
vi.mock("@/features/outcomes/components/institutional-outcomes-page", () => ({
  InstitutionalOutcomesPage: catalogPageMock,
}));
vi.mock("@/features/outcomes/components/course-alignment-administration-list", () => ({
  CourseAlignmentAdministrationList: administrationListMock,
}));

describe("Secretary Learning Outcomes route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "secretary-1",
      roles: [ROLES.SECRETARY],
      activeRole: ROLES.SECRETARY,
      profileGate: { status: "COMPLETE" },
    });
    listOutcomesMock.mockResolvedValue({ success: true, data: { outcomes: [] } });
    listSummariesMock.mockResolvedValue({ success: true, data: [] });
  });

  async function loadPage() {
    return (await import("../../app/(app)/secretary/learning-outcomes/page")).default;
  }

  it("denies non-Secretary roles before reading catalog state", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "dean-1",
      roles: [ROLES.DEAN],
      activeRole: ROLES.DEAN,
      profileGate: { status: "COMPLETE" },
    });

    const Page = await loadPage();
    await expect(Page()).rejects.toThrow(`${REDIRECT_ERROR}:/unauthorized`);
    expect(listOutcomesMock).not.toHaveBeenCalled();
    expect(listSummariesMock).not.toHaveBeenCalled();
  });

  it("loads the catalog and the course mapping administration summary", async () => {
    const Page = await loadPage();
    const rendered = await Page();

    expect(listOutcomesMock).toHaveBeenCalledTimes(1);
    expect(listSummariesMock).toHaveBeenCalledTimes(1);
    expect(rendered.props.children[0].props).toMatchObject({ outcomes: [] });
    expect(rendered.props.children[1].props).toMatchObject({ courses: [] });
  });

  it("fails safely when the catalog read is unavailable", async () => {
    listOutcomesMock.mockResolvedValue({ success: false, error: "Unexpected database detail" });

    const Page = await loadPage();
    await expect(Page()).rejects.toThrow("Institutional Outcome catalog could not be loaded.");
  });

  it("fails safely when the mapping administration read is unavailable", async () => {
    listSummariesMock.mockResolvedValue({ success: false, error: "Unexpected database detail" });

    const Page = await loadPage();
    await expect(Page()).rejects.toThrow("Course mapping administration could not be loaded.");
  });
});
