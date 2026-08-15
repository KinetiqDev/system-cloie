import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ScopedRosterCandidate } from "@/features/course-assignments/types";

const loadScopedRosterCandidatesMock = vi.hoisted(() => vi.fn());
vi.mock("@/features/course-assignments/services/course-roster-candidate-scope", () => ({
  loadScopedRosterCandidates: loadScopedRosterCandidatesMock,
}));

function candidate(
  userId: string,
  name: string,
  selectable = true
): ScopedRosterCandidate {
  return {
    userId,
    name,
    email: `${userId}@ac.edu`,
    programId: "program-1",
    selectable,
    reason: selectable ? null : "PROGRAM_MISMATCH",
  };
}

describe("searchScopedRosterStudents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadScopedRosterCandidatesMock.mockResolvedValue({
      success: true,
      data: { assignment: { assignmentId: "assignment-1" }, candidates: [] },
    });
  });

  it("requires at least two normalized characters before loading candidates", async () => {
    const { searchScopedRosterStudents } = await import(
      "@/features/course-assignments/services/search-scoped-roster-students"
    );

    await expect(searchScopedRosterStudents("assignment-1", " A ")).resolves.toEqual({
      success: false,
      error: "Enter at least 2 characters to search Students.",
    });
    expect(loadScopedRosterCandidatesMock).not.toHaveBeenCalled();
  });

  it("uses the preview-owned candidate scope, ranks exact names, and bounds results to ten", async () => {
    const candidates = [
      candidate("exact", "John"),
      candidate("prefix", "John Paul"),
      candidate("contains", "A John Student"),
      candidate("diagnostic", "John Ineligible", false),
      ...Array.from({ length: 8 }, (_, index) => candidate(`other-${index}`, `John ${index}`)),
    ];
    loadScopedRosterCandidatesMock.mockResolvedValue({
      success: true,
      data: { assignment: { assignmentId: "assignment-1" }, candidates },
    });
    const { searchScopedRosterStudents } = await import(
      "@/features/course-assignments/services/search-scoped-roster-students"
    );

    const result = await searchScopedRosterStudents("assignment-1", "  JOHN  ", "program-1");

    expect(loadScopedRosterCandidatesMock).toHaveBeenCalledWith("assignment-1", "program-1");
    expect(result).toMatchObject({ success: true, data: { assignmentId: "assignment-1" } });
    if (result.success) {
      expect(result.data.candidates).toHaveLength(10);
      expect(result.data.candidates.map((item) => item.userId)).toEqual(
        expect.arrayContaining(["exact", "prefix"])
      );
      expect(result.data.candidates[0]?.userId).toBe("exact");
      expect(result.data.candidates.map((item) => item.userId)).not.toContain("diagnostic");
    }
  });

  it("does not disclose candidates outside the shared server-authorized scope", async () => {
    loadScopedRosterCandidatesMock.mockResolvedValue({
      success: false,
      error: "Course assignment not found.",
    });
    const { searchScopedRosterStudents } = await import(
      "@/features/course-assignments/services/search-scoped-roster-students"
    );

    await expect(searchScopedRosterStudents("assignment-1", "John")).resolves.toEqual({
      success: false,
      error: "Course assignment not found.",
    });
  });
});
