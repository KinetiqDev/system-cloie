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
    programCode: null,
    programName: null,
    yearLevel: null,
    section: null,
    majorName: null,
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
      for (const item of result.data.candidates) {
        expect(item).not.toHaveProperty("studentId");
        expect(item).not.toHaveProperty("studentIdNumber");
        expect(item).not.toHaveProperty("student_id_number");
      }
    }
    expect(JSON.stringify(result)).not.toMatch(/studentId|studentIdNumber|student_id_number|Student ID/i);
  });

  it("returns the same ten tied candidates regardless of loader order", async () => {
    const tied = Array.from({ length: 12 }, (_, index) =>
      candidate(`student-${String(index + 1).padStart(2, "0")}`, "JOSÉ ÁLVAREZ")
    );
    const { searchScopedRosterStudents } = await import(
      "@/features/course-assignments/services/search-scoped-roster-students"
    );

    async function search(candidates: ScopedRosterCandidate[]) {
      loadScopedRosterCandidatesMock.mockResolvedValue({
        success: true,
        data: { assignment: { assignmentId: "assignment-1" }, candidates },
      });
      return searchScopedRosterStudents("assignment-1", "josé");
    }

    const forward = await search(tied);
    const reverse = await search([...tied].reverse());
    const expected = tied.slice(0, 10).map((item) => item.userId);

    expect(forward).toMatchObject({ success: true });
    expect(reverse).toMatchObject({ success: true });
    if (forward.success && reverse.success) {
      expect(forward.data.candidates.map((item) => item.userId)).toEqual(expected);
      expect(reverse.data.candidates.map((item) => item.userId)).toEqual(expected);
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

  it("returns an opaque support reference when candidate loading fails unexpectedly", async () => {
    loadScopedRosterCandidatesMock.mockRejectedValue(new Error("database unavailable"));
    const { searchScopedRosterStudents } = await import(
      "@/features/course-assignments/services/search-scoped-roster-students"
    );

    await expect(searchScopedRosterStudents("assignment-1", "John")).resolves.toMatchObject({
      success: false,
      error: "The roster search could not be completed.",
      referenceId: expect.any(String),
    });
  });
});
