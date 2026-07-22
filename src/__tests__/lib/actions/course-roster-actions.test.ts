import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.hoisted(() => vi.fn());
const serviceMocks = vi.hoisted(() => ({
  addRosterMembership: vi.fn(),
  removeRosterMembership: vi.fn(),
  restoreRosterMembership: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/features/course-assignments/services/manage-course-roster", () => serviceMocks);

import {
  addRosterMembershipAction,
  removeRosterMembershipAction,
  restoreRosterMembershipAction,
} from "@/lib/actions/course-roster-actions";

const assignmentId = "11111111-1111-4111-8111-111111111111";
const membershipId = "22222222-2222-4222-8222-222222222222";

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
    expect(revalidatePathMock).toHaveBeenCalledTimes(5);
  });
});
