import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ROLES } from "@/lib/constants/roles";

const REDIRECT_ERROR = "NEXT_REDIRECT";

const {
  redirectMock,
  resolveAuthSessionMock,
  resolvePostLoginDestinationMock,
  ensureRoleAccessMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`${REDIRECT_ERROR}:${path}`);
  }),
  resolveAuthSessionMock: vi.fn(),
  resolvePostLoginDestinationMock: vi.fn(),
  ensureRoleAccessMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-post-login-destination", () => ({
  resolvePostLoginDestination: resolvePostLoginDestinationMock,
}));

vi.mock("@/features/auth/policies/ensure-role-access", () => ({
  ensureRoleAccess: ensureRoleAccessMock,
}));

import { SessionGuard } from "@/features/auth/components/session-guard";

describe("SessionGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureRoleAccessMock.mockReturnValue(null);
    resolvePostLoginDestinationMock.mockReturnValue("/onboarding?intent=student");
  });

  it("redirects unauthenticated users to portal", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    await expect(SessionGuard({ children: <div>Protected</div> })).rejects.toThrow(
      `${REDIRECT_ERROR}:/portal/respondents`
    );
  });

  it("redirects onboarding-required users through resolvePostLoginDestination", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.STUDENT,
      profileGate: { status: "STUDENT_ONBOARDING_REQUIRED", intent: "student" },
    });

    await expect(SessionGuard({ children: <div>Protected</div> })).rejects.toThrow(
      `${REDIRECT_ERROR}:/onboarding?intent=student`
    );
    expect(resolvePostLoginDestinationMock).toHaveBeenCalledWith({
      requestedPath: "/dashboard",
      intent: "student",
      activeRole: ROLES.STUDENT,
      profileGate: { status: "STUDENT_ONBOARDING_REQUIRED", intent: "student" },
    });
  });

  it("preserves the inactive-account destination", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.SECRETARY,
      profileGate: { status: "INACTIVE" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/status/inactive");

    await expect(SessionGuard({ children: <div>Protected</div> })).rejects.toThrow(
      `${REDIRECT_ERROR}:/status/inactive`
    );
  });

  it("preserves the rejected external-account destination", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.ALUMNI,
      profileGate: { status: "REJECTED_EXTERNAL_ACCOUNT" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/status/rejected");

    await expect(SessionGuard({ children: <div>Protected</div> })).rejects.toThrow(
      `${REDIRECT_ERROR}:/status/rejected`
    );
  });

  it("redirects users with ROLE_SELECTION_REQUIRED status (where intent is absent) correctly", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: null,
      profileGate: { status: "ROLE_SELECTION_REQUIRED" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/onboarding?intent=student");

    await expect(SessionGuard({ children: <div>Protected</div> })).rejects.toThrow(
      `${REDIRECT_ERROR}:/onboarding?intent=student`
    );
    expect(resolvePostLoginDestinationMock).toHaveBeenCalledWith({
      requestedPath: "/dashboard",
      intent: null,
      activeRole: null,
      profileGate: { status: "ROLE_SELECTION_REQUIRED" },
    });
  });

  it("redirects unauthorized roles to /unauthorized", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      profileGate: { status: "COMPLETE" },
    });
    ensureRoleAccessMock.mockReturnValue("/unauthorized");

    await expect(
      SessionGuard({ children: <div>Protected</div>, allowedRoles: [ROLES.SECRETARY] })
    ).rejects.toThrow(`${REDIRECT_ERROR}:/unauthorized`);
    expect(ensureRoleAccessMock).toHaveBeenCalledWith({
      activeRole: ROLES.FACULTY,
      allowedRoles: [ROLES.SECRETARY],
    });
  });

  it("passes the active session role to authorization checks", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
      studentProfileId: "profile-1",
      profileGate: { status: "COMPLETE" },
    });

    await SessionGuard({ children: <div>Protected</div>, allowedRoles: [ROLES.STUDENT] });

    expect(ensureRoleAccessMock).toHaveBeenCalledWith({
      activeRole: ROLES.FACULTY,
      allowedRoles: [ROLES.STUDENT],
    });
  });

  it("redirects student role users to onboarding when their student profile is missing", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      studentProfileId: null,
      profileGate: { status: "STUDENT_ONBOARDING_REQUIRED", intent: "student" },
    });

    await expect(
      SessionGuard({
        children: <div>Protected</div>,
        allowedRoles: [ROLES.STUDENT],
      })
    ).rejects.toThrow(`${REDIRECT_ERROR}:/onboarding?intent=student`);
  });

  it("renders children for an allowed complete user", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      roles: [ROLES.SECRETARY],
      activeRole: ROLES.SECRETARY,
      studentProfileId: null,
      profileGate: { status: "COMPLETE" },
    });

    const result = await SessionGuard({
      children: <div>Allowed Content</div>,
      allowedRoles: [ROLES.SECRETARY],
    });

    render(result);
    expect(screen.getByText("Allowed Content")).toBeInTheDocument();
  });

  it("allows deferred enrollment to enter the student route", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      studentProfileId: "profile-1",
      profileGate: { status: "DEFERRED_ENROLLMENT" },
    });

    const result = await SessionGuard({
      children: <div>Deferred Content</div>,
      allowedRoles: [ROLES.STUDENT],
    });

    render(result);
    expect(screen.getByText("Deferred Content")).toBeInTheDocument();
    expect(resolvePostLoginDestinationMock).not.toHaveBeenCalled();
  });
});
