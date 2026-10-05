// fallow-ignore-file code-duplication
import { beforeEach, describe, expect, it, vi } from "vitest";

const NOT_FOUND_ERROR = "NEXT_NOT_FOUND";

const {
  notFoundMock,
  redirectMock,
  listMock,
  facetsMock,
  detailMock,
  contextMock,
  sessionMock,
  schoolYearsMock,
} = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error(NOT_FOUND_ERROR);
  }),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  listMock: vi.fn(),
  facetsMock: vi.fn(),
  detailMock: vi.fn(),
  contextMock: vi.fn(),
  sessionMock: vi.fn(),
  schoolYearsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock, redirect: redirectMock }));
vi.mock("@/features/course-assignments/services/read-course-rosters", () => ({
  listAuthorizedCourseRosterAssignments: listMock,
  listFacultyRosterFacets: facetsMock,
  getCourseRosterDetail: detailMock,
}));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: sessionMock,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: contextMock,
}));
vi.mock("@/features/academic-calendar/services/list-school-years", () => ({
  listSchoolYears: schoolYearsMock,
}));

const PERIOD_ID = "7a0211d0-5fa8-46e0-abff-9aed2f7d78a9";
const COURSE_ID = "65f5e114-f38d-40b0-8a32-e2b6020af5eb";
const PROGRAM_ID = "3e2f8f2d-cef5-40e8-932a-b06939a0f7de";

const discoveryResult = (overrides: Record<string, unknown> = {}) => ({
  success: true,
  data: {
    items: [],
    total: 0,
    page: 0,
    pageSize: 20,
    period: { mode: "current" },
    search: "",
    activePeriodId: "term-1",
    ...overrides,
  },
});

const facets = {
  success: true,
  data: {
    courses: [
      { id: COURSE_ID, code: "GESTECH", title: "Society", courseScope: "GENERAL_EDUCATION" },
    ],
    programs: [{ id: PROGRAM_ID, code: "BSIT", name: "Information Technology" }],
  },
};

async function facultyPage() {
  return (await import("../../app/(app)/faculty/course-rosters/page")).default;
}

describe("Faculty course roster route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockResolvedValue(null);
    listMock.mockResolvedValue(discoveryResult());
    facetsMock.mockResolvedValue(facets);
    schoolYearsMock.mockResolvedValue({
      items: [{ termInstances: [] }],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it("passes Faculty discovery defaults to the server read seam", async () => {
    const Page = await facultyPage();

    await Page({ searchParams: Promise.resolve({}) });

    expect(listMock).toHaveBeenCalledWith({
      facultyOnly: true,
      period: { mode: "current" },
      search: "",
      courseId: null,
      programId: null,
      yearLevel: null,
      section: null,
      courseScope: null,
      page: 0,
    });
  });

  it("passes every supported filter through to the server read seam", async () => {
    listMock.mockResolvedValue(discoveryResult({ search: "CS" }));
    const Page = await facultyPage();

    await Page({
      searchParams: Promise.resolve({
        period: PERIOD_ID,
        courseId: COURSE_ID,
        programId: PROGRAM_ID,
        yearLevel: "SECOND_YEAR",
        section: "EVENING",
        courseScope: "GENERAL_EDUCATION",
        search: "CS",
      }),
    });

    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({
        period: { mode: "term", termInstanceId: PERIOD_ID },
        search: "CS",
        courseId: COURSE_ID,
        programId: PROGRAM_ID,
        yearLevel: "SECOND_YEAR",
        section: "EVENING",
        courseScope: "GENERAL_EDUCATION",
      })
    );
  });

  it("reads the retired history param as the all-periods scope, then canonicalizes it", async () => {
    const Page = await facultyPage();

    await expect(Page({ searchParams: Promise.resolve({ history: "1" }) })).rejects.toThrow(
      "NEXT_REDIRECT:/faculty/course-rosters?period=all"
    );
    expect(listMock).toHaveBeenCalledOnce();
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ period: { mode: "all" } }));
  });

  it("canonicalizes redundant and out-of-range params, preserving filters and page", async () => {
    listMock.mockResolvedValue(discoveryResult({ total: 40, page: 1, search: "CS" }));
    const Page = await facultyPage();

    await expect(
      Page({
        searchParams: Promise.resolve({
          search: " CS ",
          view: "list",
          page: "2",
          period: "all",
        }),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/faculty/course-rosters?page=2&period=all&search=CS");
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });

  it("canonicalizes an unrecognised view away instead of failing the request", async () => {
    const Page = await facultyPage();

    await expect(Page({ searchParams: Promise.resolve({ view: "gallery" }) })).rejects.toThrow(
      "NEXT_REDIRECT:/faculty/course-rosters"
    );
    // The read still ran, so the redirect costs no extra query.
    expect(listMock).toHaveBeenCalledOnce();
  });

  it("passes Card presentation through validated URL state", async () => {
    const Page = await facultyPage();

    const rendered = await Page({ searchParams: Promise.resolve({ view: "card" }) });

    expect(rendered.props.view).toBe("card");
  });

  it("hands the Faculty member's own facet and period options to the filters", async () => {
    const Page = await facultyPage();

    const rendered = await Page({ searchParams: Promise.resolve({}) });

    expect(facetsMock).toHaveBeenCalledOnce();
    expect(schoolYearsMock).toHaveBeenCalledWith({ includeArchived: true });
    expect(rendered.props.courses).toEqual(facets.data.courses);
    expect(rendered.props.programs).toEqual(facets.data.programs);
    expect(rendered.props.termInstances).toEqual([]);
  });

  it("still renders authorized rosters when the period picker read fails", async () => {
    schoolYearsMock.mockRejectedValueOnce(new Error("Picker unavailable"));
    const Page = await facultyPage();
    const rendered = await Page({ searchParams: Promise.resolve({}) });
    expect(rendered.props.data).toEqual(discoveryResult().data);
    expect(rendered.props.termInstances).toEqual([]);
  });

  it("still renders the list when the facet read fails", async () => {
    facetsMock.mockResolvedValue({ success: false, error: "Course assignment not found." });
    const Page = await facultyPage();

    const rendered = await Page({ searchParams: Promise.resolve({}) });

    expect(rendered.props.courses).toEqual([]);
    expect(rendered.props.programs).toEqual([]);
  });

  it("passes a safe service failure and support reference to the component", async () => {
    listMock.mockResolvedValue({
      success: false,
      error: "The roster request could not be completed.",
      referenceId: "safe-123",
    });
    const Page = await facultyPage();

    const rendered = await Page({ searchParams: Promise.resolve({ view: "card" }) });

    expect(rendered.props.data).toBeNull();
    expect(rendered.props.error).toBe(
      "The roster request could not be completed. Support reference: safe-123."
    );
    expect(detailMock).not.toHaveBeenCalled();
  });

  it("canonicalizes the URL even when the read failed", async () => {
    listMock.mockResolvedValue({
      success: false,
      error: "The roster request could not be completed.",
    });
    const Page = await facultyPage();

    await expect(Page({ searchParams: Promise.resolve({ history: "1" }) })).rejects.toThrow(
      "NEXT_REDIRECT:/faculty/course-rosters?period=all"
    );
  });
});

describe("Course roster detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockResolvedValue(null);
  });

  it("maps unauthorized and missing detail results to the same not-found route behavior", async () => {
    detailMock.mockResolvedValue({ success: false, error: "Course assignment not found." });
    const Page = (await import("../../app/(app)/course-rosters/[assignmentId]/page")).default;

    await expect(
      Page({
        params: Promise.resolve({ assignmentId: "assignment-1" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow(NOT_FOUND_ERROR);
    await expect(
      Page({
        params: Promise.resolve({ assignmentId: "other" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow(NOT_FOUND_ERROR);
  });
});
