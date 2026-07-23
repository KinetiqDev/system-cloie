import { beforeEach, describe, expect, it, vi } from "vitest";

const NOT_FOUND_ERROR = "NEXT_NOT_FOUND";

const { notFoundMock, redirectMock, listMock, detailMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error(NOT_FOUND_ERROR);
  }),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  listMock: vi.fn(),
  detailMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock, redirect: redirectMock }));
vi.mock("@/features/course-assignments/services/read-course-rosters", () => ({
  listAuthorizedCourseRosterAssignments: listMock,
  getCourseRosterDetail: detailMock,
}));

describe("Course roster routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes Faculty discovery defaults and URL filters to the server read seam", async () => {
    listMock.mockResolvedValue({
      success: true,
      data: {
        items: [],
        total: 0,
        page: 0,
        pageSize: 20,
        includeHistory: true,
        search: "CS",
        activePeriodId: "term-1",
      },
    });
    const Page = (await import("../../app/(app)/faculty/course-rosters/page")).default;

    await Page({ searchParams: Promise.resolve({ search: " CS ", history: "1", page: "1" }) });

    expect(listMock).toHaveBeenCalledWith({
      facultyOnly: true,
      includeHistory: true,
      search: "CS",
      page: 0,
    });
  });

  it("maps unauthorized and missing detail results to the same not-found route behavior", async () => {
    detailMock.mockResolvedValue({ success: false, error: "Course assignment not found." });
    const Page = (await import("../../app/(app)/course-rosters/[assignmentId]/page")).default;

    await expect(
      Page({
        params: Promise.resolve({ assignmentId: "11111111-1111-4111-8111-111111111111" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow(NOT_FOUND_ERROR);
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("rejects malformed detail IDs before querying the roster service", async () => {
    const Page = (await import("../../app/(app)/course-rosters/[assignmentId]/page")).default;

    await expect(
      Page({
        params: Promise.resolve({ assignmentId: "not-an-id" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow(NOT_FOUND_ERROR);
    expect(detailMock).not.toHaveBeenCalled();
  });

  it("redirects an out-of-range discovery page to the canonical page", async () => {
    listMock.mockResolvedValue({
      success: true,
      data: {
        items: [],
        total: 1,
        page: 0,
        pageSize: 20,
        includeHistory: false,
        search: "",
        activePeriodId: "term-1",
      },
    });
    const Page = (await import("../../app/(app)/faculty/course-rosters/page")).default;

    await expect(Page({ searchParams: Promise.resolve({ page: "9" }) })).rejects.toThrow(
      "NEXT_REDIRECT:/faculty/course-rosters?page=1"
    );
  });
});
