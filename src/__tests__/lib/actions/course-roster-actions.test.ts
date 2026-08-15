import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.hoisted(() => vi.fn());
const serviceMocks = vi.hoisted(() => ({
  addRosterMembership: vi.fn(),
  importCourseRoster: vi.fn(),
  previewCourseRoster: vi.fn(),
  searchScopedRosterStudents: vi.fn(),
  removeRosterMembership: vi.fn(),
  restoreRosterMembership: vi.fn(),
}));
const authSessionMock = vi.hoisted(() => vi.fn(async () => null));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: authSessionMock,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: vi.fn(),
}));
vi.mock("@/features/course-assignments/services/manage-course-roster", () => serviceMocks);
vi.mock("@/features/course-assignments/services/import-course-roster", () => ({
  importCourseRoster: serviceMocks.importCourseRoster,
}));
vi.mock("@/features/course-assignments/services/preview-course-roster", () => ({
  previewCourseRoster: serviceMocks.previewCourseRoster,
}));
vi.mock("@/features/course-assignments/services/search-scoped-roster-students", () => ({
  searchScopedRosterStudents: serviceMocks.searchScopedRosterStudents,
}));

import {
  addRosterMembershipAction,
  removeRosterMembershipAction,
  restoreRosterMembershipAction,
  importCourseRosterAction,
} from "@/lib/actions/course-roster-actions";

const assignmentId = "11111111-1111-4111-8111-111111111111";
const membershipId = "22222222-2222-4222-8222-222222222222";
const programId = "33333333-3333-4333-8333-333333333333";

describe("course roster actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes valid add input and revalidates routes after success", async () => {
    serviceMocks.addRosterMembership.mockResolvedValue({
      success: true,
      data: { outcome: "CREATED", message: "Student added to Course roster." },
    });

    await addRosterMembershipAction({ assignmentId, studentEmail: " STUDENT@EXAMPLE.COM " });

    expect(serviceMocks.addRosterMembership).toHaveBeenCalledWith(
      assignmentId,
      "student@example.com"
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(`/course-rosters/${assignmentId}`);
    expect(revalidatePathMock).toHaveBeenCalledWith("/faculty/course-rosters");
  });

  it("does not write or revalidate invalid input", async () => {
    const result = await addRosterMembershipAction({ assignmentId: "bad", studentEmail: "bad" });

    expect(result).toEqual({ success: false, error: "Enter a valid Student email address." });
    expect(serviceMocks.addRosterMembership).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("uses restore and remove service seams", async () => {
    serviceMocks.restoreRosterMembership.mockResolvedValue({
      success: true,
      data: { outcome: "RESTORED", message: "Student membership restored." },
    });
    serviceMocks.removeRosterMembership.mockResolvedValue({
      success: false,
      error: "Student membership is already removed.",
    });

    await restoreRosterMembershipAction({ assignmentId, membershipId });
    await removeRosterMembershipAction({ assignmentId, membershipId });

    expect(serviceMocks.restoreRosterMembership).toHaveBeenCalledWith(assignmentId, membershipId);
    expect(serviceMocks.removeRosterMembership).toHaveBeenCalledWith(assignmentId, membershipId);
    expect(revalidatePathMock).toHaveBeenCalledTimes(4);
  });

  it("rejects malformed import action input before service call", async () => {
    await expect(importCourseRosterAction({ assignmentId: "bad", csvText: "email\na@example.com" })).resolves.toEqual({
      success: false,
      error: "Choose a valid CSV file.",
    });
    expect(serviceMocks.importCourseRoster).not.toHaveBeenCalled();
  });

  it("passes valid name CSV text to the no-write preview seam", async () => {
    serviceMocks.importCourseRoster.mockResolvedValue({
      success: true,
      data: { total: 1, parsed: 1, invalid: 0, rows: [] },
    });

    await importCourseRosterAction({ assignmentId, csvText: "name\nMaria Santos" });

    expect(serviceMocks.importCourseRoster).toHaveBeenCalledWith(assignmentId, "name\nMaria Santos");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("passes selected Program scope and revalidates exact selected routes", async () => {
    serviceMocks.addRosterMembership.mockResolvedValue({
      success: true,
      data: { outcome: "CREATED", message: "Student added to Course roster." },
    });
    await addRosterMembershipAction({
      assignmentId,
      programId,
      studentEmail: "student@example.com",
    });

    expect(serviceMocks.addRosterMembership).toHaveBeenCalledWith(
      assignmentId,
      "student@example.com",
      programId
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/program-head/programs/${programId}/course-assignments`
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/program-head/programs/${programId}/course-rosters/${assignmentId}`
    );
  });
});

describe("previewCourseRosterAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates input and forwards the parsed request to the preview service", async () => {
    const previewResult = {
      success: true,
      data: {
        assignmentId,
        rows: [],
        summary: { readyToCreate: 0, willRestore: 0, alreadyActive: 0, needsReview: 1, ineligible: 0 },
      },
    };
    serviceMocks.previewCourseRoster.mockResolvedValue(previewResult);

    const { previewCourseRosterAction } = await import("@/lib/actions/course-roster-actions");
    const result = await previewCourseRosterAction({
      assignmentId,
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });

    expect(result).toEqual(previewResult);
    expect(serviceMocks.previewCourseRoster).toHaveBeenCalledWith({
      assignmentId,
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects invalid rows without calling the preview service", async () => {
    const { previewCourseRosterAction } = await import("@/lib/actions/course-roster-actions");
    const result = await previewCourseRosterAction({
      assignmentId,
      rows: [{ sourceIndex: -1, submittedName: "", status: "UNKNOWN" }],
    });

    expect(result).toEqual({
      success: false,
      error: "Enter a valid roster preview request.",
    });
    expect(serviceMocks.previewCourseRoster).not.toHaveBeenCalled();
  });
});

describe("searchScopedRosterStudentsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates input and delegates to the assignment-scoped search service", async () => {
    const searchResult = {
      success: true,
      data: { assignmentId, candidates: [] },
    };
    serviceMocks.searchScopedRosterStudents.mockResolvedValue(searchResult);
    const { searchScopedRosterStudentsAction } = await import(
      "@/lib/actions/course-roster-actions"
    );

    await expect(
      searchScopedRosterStudentsAction({ assignmentId, query: "Andy" })
    ).resolves.toEqual(searchResult);
    expect(serviceMocks.searchScopedRosterStudents).toHaveBeenCalledWith(assignmentId, "Andy", undefined);
  });

  it("rejects malformed search requests without invoking its service", async () => {
    const { searchScopedRosterStudentsAction } = await import(
      "@/lib/actions/course-roster-actions"
    );

    await expect(searchScopedRosterStudentsAction({ assignmentId: "invalid" })).resolves.toEqual({
      success: false,
      error: "Enter a valid Student search.",
    });
    expect(serviceMocks.searchScopedRosterStudents).not.toHaveBeenCalled();
  });
});
