/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@prisma/client";
import {
  createLegalAcknowledgementTicket,
  LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME,
} from "@/features/legal/services/legal-acknowledgement-ticket";
import { buildAuthSessionSnapshot } from "@/features/auth/services/build-auth-session-snapshot";

const {
  exchangeCodeForSessionMock,
  signOutMock,
  resolveAuthSessionFromUserMock,
  findUniqueUserMock,
  upsertUserRoleMock,
  readActiveRoleCookieMock,
  setActiveRoleCookieMock,
} = vi.hoisted(() => ({
  exchangeCodeForSessionMock: vi.fn(),
  signOutMock: vi.fn(),
  resolveAuthSessionFromUserMock: vi.fn(),
  findUniqueUserMock: vi.fn(),
  upsertUserRoleMock: vi.fn(),
  readActiveRoleCookieMock: vi.fn(),
  setActiveRoleCookieMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
      signOut: signOutMock,
    },
  })),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
  resolveAuthSessionFromUser: resolveAuthSessionFromUserMock,
}));

vi.mock("@/features/auth/services/active-role-cookie", () => ({
  readActiveRoleCookie: readActiveRoleCookieMock,
  setActiveRoleCookie: setActiveRoleCookieMock,
  clearActiveRoleCookie: vi.fn(),
  ACTIVE_ROLE_COOKIE_NAME: "cloie_active_role",
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: findUniqueUserMock },
    userRole: { upsert: upsertUserRoleMock },
  },
}));

import { GET } from "@/app/api/auth/callback/route";

const AUTH_ID = "00000000-0000-0000-0000-0000000000a1";

describe("auth callback multi-role intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://cloie.test");
    vi.stubEnv("CLOIE_LEGAL_TICKET_SECRET", "legal-ticket-test-secret-012345678901");
  });

  function alumniIntentRequest() {
    return new Request("https://cloie.test/api/auth/callback?code=abc&intent=alumni", {
      headers: {
        cookie: `${LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME}=${createLegalAcknowledgementTicket("alumni" as never)}`,
      },
    });
  }

  it("sends a freshly claimed alumni role to alumni onboarding, not the stale faculty context", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: { user: { id: AUTH_ID, email: "user@acd.edu.ph", user_metadata: {} } },
    });
    const facultyUser = {
      id: "domain-user-1",
      auth_user_id: AUTH_ID,
      email: "user@acd.edu.ph",
      name: "Existing User",
      roles: [{ role: SystemRole.FACULTY }],
    };
    findUniqueUserMock.mockImplementation(async (args: { where: Record<string, unknown> }) => {
      if (args.where.auth_user_id) return facultyUser;
      if (args.where.email) return facultyUser;
      return {
        ...facultyUser,
        roles: [{ role: SystemRole.FACULTY }, { role: SystemRole.ALUMNI }],
      };
    });
    upsertUserRoleMock.mockResolvedValue({});
    // Stale cookie from the earlier faculty session survives logout.
    readActiveRoleCookieMock.mockResolvedValue("FACULTY");
    resolveAuthSessionFromUserMock.mockResolvedValue(
      buildAuthSessionSnapshot({
        userId: facultyUser.id,
        email: facultyUser.email,
        name: facultyUser.name,
        roles: ["FACULTY", "ALUMNI"],
        activeRole: "FACULTY",
        studentProfileId: null,
        alumniProfileId: null,
        industryPartnerProfileId: null,
        hasFacultyAffiliation: true,
      })
    );

    const response = await GET(alumniIntentRequest());

    expect(upsertUserRoleMock).toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://cloie.test/onboarding?intent=alumni");
    expect(setActiveRoleCookieMock).toHaveBeenCalledWith(expect.anything(), "ALUMNI");
  });
});
