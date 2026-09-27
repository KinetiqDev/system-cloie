/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import {
  approveFacultyRequestAction,
  rejectFacultyRequestAction,
} from "@/lib/actions/faculty-approval-actions";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { requireLegalAcknowledgement } from "@/features/legal/services/require-legal-acknowledgement";
import {
  approveFacultyAccessRequest,
  rejectFacultyAccessRequest,
} from "@/features/users/services/manage-faculty-access-requests";

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));

vi.mock("@/features/legal/services/require-legal-acknowledgement", () => ({
  requireLegalAcknowledgement: vi.fn(),
}));

vi.mock("@/features/users/services/manage-faculty-access-requests", () => ({
  approveFacultyAccessRequest: vi.fn(),
  rejectFacultyAccessRequest: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

function secretarySession(overrides: Record<string, unknown> = {}) {
  return {
    userId: "secretary-1",
    activeRole: ROLES.SECRETARY,
    profileGate: { status: "COMPLETE" },
    ...overrides,
  };
}

describe("faculty decision actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireLegalAcknowledgement as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      acknowledged: true,
    });
    (resolveAuthSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(secretarySession());
    (approveFacultyAccessRequest as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: "APPROVED",
    });
    (rejectFacultyAccessRequest as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: "REJECTED",
    });
  });

  it("approves through the service with the deciding Secretary", async () => {
    const result = await approveFacultyRequestAction({ userId: USER_ID, note: "Eligible" });

    expect(result.success).toBe(true);
    expect(approveFacultyAccessRequest).toHaveBeenCalledWith({
      requestUserId: USER_ID,
      decidedByUserId: "secretary-1",
      note: "Eligible",
    });
  });

  it("rejects through the service and scopes the note", async () => {
    const result = await rejectFacultyRequestAction({ userId: USER_ID });

    expect(result.success).toBe(true);
    expect(rejectFacultyAccessRequest).toHaveBeenCalledWith({
      requestUserId: USER_ID,
      decidedByUserId: "secretary-1",
      note: null,
    });
  });

  it("refuses a caller whose active role is not Secretary", async () => {
    (resolveAuthSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      secretarySession({ activeRole: ROLES.PROGRAM_HEAD })
    );

    const result = await approveFacultyRequestAction({ userId: USER_ID });

    expect(result).toEqual({ success: false, error: "Secretary access required." });
    expect(approveFacultyAccessRequest).not.toHaveBeenCalled();
  });

  it("refuses without a current legal acknowledgement", async () => {
    (requireLegalAcknowledgement as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      acknowledged: false,
      reason: "expired",
    });

    const result = await rejectFacultyRequestAction({ userId: USER_ID });

    expect(result.success).toBe(false);
    expect(rejectFacultyAccessRequest).not.toHaveBeenCalled();
  });

  it("refuses a Secretary session that is not ready", async () => {
    (resolveAuthSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      secretarySession({ profileGate: { status: "INACTIVE" } })
    );

    const result = await approveFacultyRequestAction({ userId: USER_ID });

    expect(result.success).toBe(false);
    expect(approveFacultyAccessRequest).not.toHaveBeenCalled();
  });

  it("rejects a malformed user id before any decision is issued", async () => {
    const result = await approveFacultyRequestAction({ userId: "not-a-uuid" });

    expect(result.success).toBe(false);
    expect(approveFacultyAccessRequest).not.toHaveBeenCalled();
  });

  it("surfaces a service failure instead of claiming success", async () => {
    (approveFacultyAccessRequest as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "Faculty request not found.",
    });

    const result = await approveFacultyRequestAction({ userId: USER_ID });

    expect(result).toEqual({ success: false, error: "Faculty request not found." });
  });
});
