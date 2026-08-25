import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  })
);
const listMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/features/course-assignments/services/list-course-assignments", () => ({
  listCourseAssignments: listMock,
}));

import { loadCourseAssignmentListPage } from "@/features/course-assignments/services/load-course-assignment-list-page";

describe("loadCourseAssignmentListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 0, pageSize: 20 },
    });
  });

  it("redirects malformed and unknown query state to the canonical URL", async () => {
    await expect(
      loadCourseAssignmentListPage({
        pathname: "/secretary/course-assignments",
        rawSearchParams: { page: "0", unknown: "value" },
        role: "all-program",
      })
    ).rejects.toThrow("REDIRECT:/secretary/course-assignments");
    expect(listMock).not.toHaveBeenCalled();
  });

  it("passes only validated filters and zero-based service pagination", async () => {
    listMock.mockResolvedValueOnce({
      success: true,
      data: { items: [], total: 41, page: 2, pageSize: 20 },
    });

    const result = await loadCourseAssignmentListPage({
      pathname: "/program-head/course-assignments",
      rawSearchParams: { page: "3", q: "faculty" },
      role: "program-head",
      programId: "program-1",
    });

    expect(listMock).toHaveBeenCalledWith(
      { q: "faculty" },
      { page: 2, pageSize: 20, programId: "program-1" }
    );
    expect(result.initialFilters.searchQuery).toBe("faculty");
  });

  it("passes no status predicate when all statuses are explicitly selected", async () => {
    const result = await loadCourseAssignmentListPage({
      pathname: "/secretary/course-assignments",
      rawSearchParams: { isActive: "all" },
      role: "all-program",
    });

    expect(listMock).toHaveBeenCalledWith({}, { page: 0, pageSize: 20 });
    expect(result.initialFilters.isActive).toBeNull();
  });

  it("canonicalizes a bare Program Head list to its active academic period", async () => {
    await expect(
      loadCourseAssignmentListPage({
        pathname: "/program-head/programs/program-1/course-assignments",
        rawSearchParams: {},
        role: "program-head",
        programId: "program-1",
        defaultTermInstanceId: "11111111-1111-4111-a111-111111111111",
      })
    ).rejects.toThrow(
      "REDIRECT:/program-head/programs/program-1/course-assignments?termInstanceId=11111111-1111-4111-a111-111111111111"
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it("redirects a valid page beyond the available result set", async () => {
    listMock.mockResolvedValueOnce({
      success: true,
      data: { items: [], total: 21, page: 2, pageSize: 20 },
    });

    await expect(
      loadCourseAssignmentListPage({
        pathname: "/secretary/course-assignments",
        rawSearchParams: { page: "3" },
        role: "all-program",
      })
    ).rejects.toThrow("REDIRECT:/secretary/course-assignments?page=2");
  });
});
