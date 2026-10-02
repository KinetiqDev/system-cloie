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
import type { AuthSessionSnapshot } from "@/features/auth/services/build-auth-session-snapshot";
import {
  approveFacultyAccessRequest,
  rejectFacultyAccessRequest,
} from "@/features/users/services/manage-faculty-access-requests";

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));

vi.mock("@/features/users/services/manage-faculty-access-requests", () => ({
  approveFacultyAccessRequest: vi.fn(),
  rejectFacultyAccessRequest: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

function secretarySession(overrides: Partial<AuthSessionSnapshot> = {}): AuthSessionSnapshot {
  return {
    userId: "secretary-1",
    email: "secretary@acd.edu.ph",
    name: "System CLOIE Secretary",
    roles: [ROLES.SECRETARY],
    activeRole: ROLES.SECRETARY,
    studentProfileId: null,
    alumniProfileId: null,
    industryPartnerProfileId: null,
    alumniVerificationStatus: null,
    industryPartnerVerificationStatus: null,
    facultyApprovalStatus: null,
    authMethod: "google",
    profileGate: { status: "COMPLETE" },
    ...overrides,
  };
}

describe("faculty decision actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveAuthSession).mockResolvedValue(secretarySession());
    vi.mocked(approveFacultyAccessRequest).mockResolvedValue({
      success: true,
      status: "APPROVED",
    });
    vi.mocked(rejectFacultyAccessRequest).mockResolvedValue({
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

  it("decides from an authorized session alone, with no entry ticket to re-obtain", async () => {
    // The signed acknowledgement ticket is per sign-in and is cleared by the
    // OAuth callback, so a Secretary reviewing requests after a normal entry
    // holds none. The decision must still go through rather than dead-ending.
    const result = await approveFacultyRequestAction({ userId: USER_ID });

    expect(result).toEqual({ success: true });
    expect(approveFacultyAccessRequest).toHaveBeenCalled();
  });

  it("refuses a caller whose active role is not Secretary", async () => {
    vi.mocked(resolveAuthSession).mockResolvedValue(
      secretarySession({ activeRole: ROLES.PROGRAM_HEAD })
    );

    const result = await approveFacultyRequestAction({ userId: USER_ID });

    expect(result).toEqual({ success: false, error: "Secretary access required." });
    expect(approveFacultyAccessRequest).not.toHaveBeenCalled();
  });

  it("refuses a Secretary whose account is not ready", async () => {
    vi.mocked(resolveAuthSession).mockResolvedValue(
      secretarySession({ profileGate: { status: "INACTIVE" } })
    );

    const result = await approveFacultyRequestAction({ userId: USER_ID });

    expect(result.success).toBe(false);
    expect(approveFacultyAccessRequest).not.toHaveBeenCalled();
  });

  it("refuses a non-Google Secretary session through the method gate", async () => {
    // A password/OTP session resolves SECRETARY to AUTH_METHOD_MISMATCH, so
    // the readiness check still refuses it without an explicit method test.
    vi.mocked(resolveAuthSession).mockResolvedValue(
      secretarySession({
        authMethod: "password",
        profileGate: { status: "AUTH_METHOD_MISMATCH", role: ROLES.SECRETARY },
      })
    );

    const result = await rejectFacultyRequestAction({ userId: USER_ID });

    expect(result).toEqual({ success: false, error: "Your Secretary account is not ready." });
    expect(rejectFacultyAccessRequest).not.toHaveBeenCalled();
  });

  it("refuses when there is no session at all", async () => {
    vi.mocked(resolveAuthSession).mockResolvedValue(null);

    const result = await approveFacultyRequestAction({ userId: USER_ID });

    expect(result).toEqual({ success: false, error: "Secretary access required." });
    expect(approveFacultyAccessRequest).not.toHaveBeenCalled();
  });

  it("rejects a malformed user id before any decision is issued", async () => {
    const result = await approveFacultyRequestAction({ userId: "not-a-uuid" });

    expect(result.success).toBe(false);
    expect(approveFacultyAccessRequest).not.toHaveBeenCalled();
  });

  it("surfaces a service failure instead of claiming success", async () => {
    vi.mocked(approveFacultyAccessRequest).mockResolvedValue({
      success: false,
      error: "Faculty request not found.",
    });

    const result = await approveFacultyRequestAction({ userId: USER_ID });

    expect(result).toEqual({ success: false, error: "Faculty request not found." });
  });

  it("surfaces an archived-program refusal from the service", async () => {
    vi.mocked(approveFacultyAccessRequest).mockResolvedValue({
      success: false,
      error:
        "This applicant's requested program is archived or inactive. Decline this request and ask them to request an active program.",
    });

    const result = await approveFacultyRequestAction({ userId: USER_ID });

    expect(result.success).toBe(false);
    expect(result).toEqual({
      success: false,
      error:
        "This applicant's requested program is archived or inactive. Decline this request and ask them to request an active program.",
    });
  });
});
