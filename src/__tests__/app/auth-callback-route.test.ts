/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@prisma/client";
import {
  createLegalAcknowledgementTicket,
  LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME,
} from "@/features/legal/services/legal-acknowledgement-ticket";

const {
  getClaimsMock,
  exchangeCodeForSessionMock,
  signOutMock,
  resolveAuthSessionMock,
  resolveAuthSessionFromUserMock,
  resolvePostLoginDestinationMock,
  findUniqueUserMock,
  updateUserMock,
  updateManyUserMock,
  createUserMock,
  createUserRoleMock,
  findFirstUserRoleMock,
  upsertUserRoleMock,
  transactionMock,
} = vi.hoisted(() => ({
  getClaimsMock: vi.fn(),
  exchangeCodeForSessionMock: vi.fn(),
  signOutMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  resolveAuthSessionFromUserMock: vi.fn(),
  resolvePostLoginDestinationMock: vi.fn(),
  findUniqueUserMock: vi.fn(),
  updateUserMock: vi.fn(),
  updateManyUserMock: vi.fn(),
  createUserMock: vi.fn(),
  createUserRoleMock: vi.fn(),
  findFirstUserRoleMock: vi.fn(),
  upsertUserRoleMock: vi.fn(),
  transactionMock: vi.fn(async (callback) => {
    const tx = {
      user: {
        update: updateUserMock,
        updateMany: updateManyUserMock,
        findUnique: findUniqueUserMock,
        create: createUserMock,
      },
      userRole: {
        upsert: upsertUserRoleMock,
        create: createUserRoleMock,
        findFirst: findFirstUserRoleMock,
      },
    };
    return callback(tx);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
      signOut: signOutMock,
      getClaims: getClaimsMock,
    },
  })),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
  resolveAuthSessionFromUser: resolveAuthSessionFromUserMock,
}));

vi.mock("@/features/auth/services/resolve-post-login-destination", () => ({
  resolvePostLoginDestination: resolvePostLoginDestinationMock,
}));

vi.mock("@/features/auth/services/active-role-cookie", () => ({
  readActiveRoleCookie: vi.fn().mockResolvedValue(null),
  setActiveRoleCookie: vi.fn(),
  clearActiveRoleCookie: vi.fn(),
  ACTIVE_ROLE_COOKIE_NAME: "cloie_active_role",
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueUserMock,
      update: updateUserMock,
      updateMany: updateManyUserMock,
      create: createUserMock,
    },
    userRole: {
      create: createUserRoleMock,
      findFirst: findFirstUserRoleMock,
      upsert: upsertUserRoleMock,
    },
    $transaction: transactionMock,
  },
}));

import { GET } from "@/app/api/auth/callback/route";

const VALID_UUID_1 = "00000000-0000-0000-0000-000000000001";
const VALID_UUID_2 = "00000000-0000-0000-0000-000000000002";

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://cloie.test");
    vi.stubEnv("CLOIE_LEGAL_TICKET_SECRET", "legal-ticket-test-secret-012345678901");
    // The callback proves the exchanged session is Google before any link.
    getClaimsMock.mockResolvedValue({
      data: { claims: { amr: [{ method: "oauth" }], app_metadata: { provider: "google" } } },
      error: null,
    });
    resolvePostLoginDestinationMock.mockReturnValue("/student/dashboard");
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: "STUDENT",
      roles: ["STUDENT"],
      profileGate: { status: "COMPLETE" },
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "STUDENT",
      roles: ["STUDENT"],
      profileGate: { status: "COMPLETE" },
    });
  });

  function callbackRequest(url: string, intent?: string, includeTicket = true) {
    return new Request(url, {
      headers:
        intent && includeTicket
          ? {
              cookie: `${LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME}=${createLegalAcknowledgementTicket(intent as never)}`,
            }
          : undefined,
    });
  }

  it("redirects auth failures to the login error page", async () => {
    const response = await GET(new Request("https://cloie.test/api/auth/callback"));

    expect(response.headers.get("location")).toContain("/login?error=auth-failure");
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
  });

  it("signs out and redirects invalid domains to the invalid-domain login page when intent is passed", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "user@gmail.com",
          user_metadata: { name: "External User" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue(null);

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=faculty", "faculty")
    );

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(createUserMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("/status/invalid-domain");
  });

  it("redirects new users with no intent to the role selection portal", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: { user: { id: VALID_UUID_1, email: "user@gmail.com" } },
    });
    findUniqueUserMock.mockResolvedValue(null);

    const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc"));

    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://cloie.test/");
  });

  it("rejects a valid intent without an acknowledgement ticket before exchanging OAuth code", async () => {
    const response = await GET(
      callbackRequest(
        "https://cloie.test/api/auth/callback?code=abc&intent=faculty",
        "faculty",
        false
      )
    );

    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://cloie.test/");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("rejects a malformed acknowledgement cookie without throwing", async () => {
    const response = await GET(
      new Request("https://cloie.test/api/auth/callback?code=abc&intent=student", {
        headers: { cookie: `${LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME}=%` },
      })
    );

    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://cloie.test/");
  });

  it("rejects an expired acknowledgement ticket before exchanging the OAuth code", async () => {
    const expiredTicket = createLegalAcknowledgementTicket("student", 1000);
    const response = await GET(
      new Request("https://cloie.test/api/auth/callback?code=abc&intent=student", {
        headers: { cookie: `${LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME}=${expiredTicket}` },
      })
    );

    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://cloie.test/");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("rejects existing users with no intent before exchanging OAuth code", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: { user: { id: VALID_UUID_1, email: "user@acd.edu.ph" } },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      name: "Existing User",
      roles: [{ role: SystemRole.FACULTY }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "FACULTY",
      roles: ["FACULTY"],
      profileGate: { status: "COMPLETE" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/faculty/dashboard");

    const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc"));

    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://cloie.test/");
  });

  it("creates a new self-service account with the Google-derived canonical name", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "jane@example.com",
          user_metadata: {
            name: "Jane Doe",
            full_name: "Should Not Win",
            given_name: "Nope",
            family_name: "Nope",
          },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({
      id: "new-user-id",
      auth_user_id: VALID_UUID_1,
      email: "jane@example.com",
      name: "Jane Doe",
      roles: [{ role: SystemRole.ALUMNI }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "ALUMNI",
      roles: ["ALUMNI"],
      profileGate: { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/onboarding?intent=alumni");

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=alumni", "alumni")
    );

    expect(createUserMock).toHaveBeenCalledWith({
      data: {
        auth_user_id: VALID_UUID_1,
        email: "jane@example.com",
        name: "Jane Doe",
        roles: { create: { role: SystemRole.ALUMNI } },
      },
      include: { roles: true },
    });
    expect(response.headers.get("location")).toBe("https://cloie.test/onboarding?intent=alumni");
  });

  it("uses full_name when name is absent for new accounts", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "juan@example.com",
          user_metadata: { full_name: "Juan Dela Cruz" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({
      id: "new-user-id",
      auth_user_id: VALID_UUID_1,
      email: "juan@example.com",
      name: "Juan Dela Cruz",
      roles: [{ role: SystemRole.ALUMNI }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "ALUMNI",
      roles: ["ALUMNI"],
      profileGate: { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/onboarding?intent=alumni");

    await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=alumni", "alumni")
    );

    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Juan Dela Cruz" }),
      })
    );
  });

  it("uses complete given_name + family_name when higher-precedence claims are absent", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "maria@example.com",
          user_metadata: { given_name: "Maria", family_name: "Santos" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({
      id: "new-user-id",
      auth_user_id: VALID_UUID_1,
      email: "maria@example.com",
      name: "Maria Santos",
      roles: [{ role: SystemRole.ALUMNI }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "ALUMNI",
      roles: ["ALUMNI"],
      profileGate: { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/onboarding?intent=alumni");

    await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=alumni", "alumni")
    );

    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Maria Santos" }),
      })
    );
  });

  it("preserves single-word provider names without inventing a second part", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "madonna@example.com",
          user_metadata: { full_name: "  Madonna  " },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({
      id: "new-user-id",
      auth_user_id: VALID_UUID_1,
      email: "madonna@example.com",
      name: "Madonna",
      roles: [{ role: SystemRole.ALUMNI }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "ALUMNI",
      roles: ["ALUMNI"],
      profileGate: { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/onboarding?intent=alumni");

    await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=alumni", "alumni")
    );

    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Madonna" }),
      })
    );
  });

  it("blocks new account creation when provider name is missing and does not invent placeholders", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "noname@example.com",
          user_metadata: { email: "noname@example.com" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue(null);

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=alumni", "alumni")
    );

    expect(createUserMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toBe("https://cloie.test/status/missing-google-name");
  });

  it("first-links an unlinked Secretary-created account by replacing the provisional name", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "Unlinked@ACD.edu.ph ",
          user_metadata: { given_name: "GoogleFirst", family_name: "GoogleLast" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValueOnce(null); // by auth_user_id
    findUniqueUserMock.mockResolvedValueOnce({
      // by normalized email
      id: "domain-user-1",
      email: "unlinked@acd.edu.ph",
      auth_user_id: null,
      is_active: true,
      name: "Provisional Secretary Name",
      roles: [{ role: SystemRole.FACULTY }],
    });
    updateManyUserMock.mockResolvedValue({ count: 1 });
    findUniqueUserMock.mockResolvedValueOnce({
      // re-fetch after conditional claim
      id: "domain-user-1",
      email: "unlinked@acd.edu.ph",
      auth_user_id: VALID_UUID_1,
      is_active: true,
      name: "GoogleFirst GoogleLast",
      roles: [{ role: SystemRole.FACULTY }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "FACULTY",
      roles: ["FACULTY"],
      profileGate: { status: "COMPLETE" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/faculty/dashboard");

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=faculty", "faculty")
    );

    expect(findUniqueUserMock).toHaveBeenNthCalledWith(2, {
      where: { email: "unlinked@acd.edu.ph" },
      include: { roles: true },
    });
    expect(updateManyUserMock).toHaveBeenCalledWith({
      where: { id: "domain-user-1", auth_user_id: null },
      data: {
        auth_user_id: VALID_UUID_1,
        name: "GoogleFirst GoogleLast",
      },
    });
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://cloie.test/faculty/dashboard");
  });

  it("leaves an unlinked account unchanged when first link has no usable provider name", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "unlinked@acd.edu.ph",
          user_metadata: {},
        },
      },
    });
    findUniqueUserMock.mockResolvedValueOnce(null);
    findUniqueUserMock.mockResolvedValueOnce({
      id: "domain-user-1",
      email: "unlinked@acd.edu.ph",
      auth_user_id: null,
      is_active: true,
      name: "Provisional Name",
      roles: [{ role: SystemRole.STUDENT }],
    });

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=student", "student")
    );

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toBe("https://cloie.test/status/missing-google-name");
  });

  it("preserves the stored name for an already-linked account even when Google metadata changes", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "user@acd.edu.ph",
          user_metadata: { name: "Jane Smith" },
        },
      },
    });
    // auth_user_id hit, then same-user email ownership check
    findUniqueUserMock
      .mockResolvedValueOnce({
        id: "domain-user-1",
        auth_user_id: VALID_UUID_1,
        email: "user@acd.edu.ph",
        name: "Jane Doe",
        is_active: true,
        roles: [{ role: SystemRole.FACULTY }],
      })
      .mockResolvedValueOnce({
        id: "domain-user-1",
        auth_user_id: VALID_UUID_1,
        email: "user@acd.edu.ph",
        name: "Jane Doe",
        is_active: true,
        roles: [{ role: SystemRole.FACULTY }],
      });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "FACULTY",
      roles: ["FACULTY"],
      profileGate: { status: "COMPLETE" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/faculty/dashboard");

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=faculty", "faculty")
    );

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(createUserMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://cloie.test/faculty/dashboard");
  });

  it("preserves a Secretary-corrected name and continues when later metadata is absent", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "user@acd.edu.ph",
          user_metadata: {},
        },
      },
    });
    findUniqueUserMock
      .mockResolvedValueOnce({
        id: "domain-user-1",
        auth_user_id: VALID_UUID_1,
        email: "user@acd.edu.ph",
        name: "Maria Dela Cruz",
        is_active: true,
        roles: [{ role: SystemRole.STUDENT }],
      })
      .mockResolvedValueOnce({
        id: "domain-user-1",
        auth_user_id: VALID_UUID_1,
        email: "user@acd.edu.ph",
        name: "Maria Dela Cruz",
        is_active: true,
        roles: [{ role: SystemRole.STUDENT }],
      });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "STUDENT",
      roles: ["STUDENT"],
      profileGate: { status: "COMPLETE" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/student/dashboard");

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=student", "student")
    );

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://cloie.test/student/dashboard");
  });

  it("fails closed on identity conflict without mutating the linked record", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_2,
          email: "linked@acd.edu.ph",
          user_metadata: { name: "Attacker Name" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValueOnce(null);
    findUniqueUserMock.mockResolvedValueOnce({
      id: "domain-user-1",
      email: "linked@acd.edu.ph",
      auth_user_id: VALID_UUID_1,
      is_active: true,
      name: "Original Name",
      roles: [{ role: SystemRole.FACULTY }],
    });

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=faculty", "faculty")
    );

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(createUserMock).not.toHaveBeenCalled();
    expect(createUserRoleMock).not.toHaveBeenCalled();
    expect(upsertUserRoleMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toBe("https://cloie.test/status/identity-conflict");
    expect(response.headers.get("location")).not.toContain(VALID_UUID_1);
    expect(response.headers.get("location")).not.toContain(VALID_UUID_2);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("fails closed when auth-linked user email matches a different domain User", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "other@acd.edu.ph",
          user_metadata: { name: "Should Not Matter" },
        },
      },
    });
    // Current Auth identity is linked to domain User A...
    findUniqueUserMock.mockResolvedValueOnce({
      id: "domain-user-a",
      auth_user_id: VALID_UUID_1,
      email: "user-a@acd.edu.ph",
      name: "User A",
      is_active: true,
      roles: [{ role: SystemRole.FACULTY }],
    });
    // ...but the current OAuth email belongs to domain User B (different auth).
    findUniqueUserMock.mockResolvedValueOnce({
      id: "domain-user-b",
      auth_user_id: VALID_UUID_2,
      email: "other@acd.edu.ph",
      name: "User B",
      is_active: true,
      roles: [{ role: SystemRole.STUDENT }],
    });

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=faculty", "faculty")
    );

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(createUserMock).not.toHaveBeenCalled();
    expect(createUserRoleMock).not.toHaveBeenCalled();
    expect(resolveAuthSessionFromUserMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toBe("https://cloie.test/status/identity-conflict");
    expect(response.headers.get("location")).not.toContain("domain-user-a");
    expect(response.headers.get("location")).not.toContain("domain-user-b");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("turns a lost first-link race into identity-conflict without overwriting the winner", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_2,
          email: "race@acd.edu.ph",
          user_metadata: { name: "Loser Name" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValueOnce(null);
    findUniqueUserMock.mockResolvedValueOnce({
      id: "domain-user-1",
      email: "race@acd.edu.ph",
      auth_user_id: null,
      is_active: true,
      name: "Provisional",
      roles: [{ role: SystemRole.FACULTY }],
    });
    // Concurrent winner already claimed the row.
    updateManyUserMock.mockResolvedValue({ count: 0 });

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=faculty", "faculty")
    );

    expect(updateManyUserMock).toHaveBeenCalledWith({
      where: { id: "domain-user-1", auth_user_id: null },
      data: {
        auth_user_id: VALID_UUID_2,
        name: "Loser Name",
      },
    });
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(createUserMock).not.toHaveBeenCalled();
    expect(createUserRoleMock).not.toHaveBeenCalled();
    expect(resolveAuthSessionFromUserMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toBe("https://cloie.test/status/identity-conflict");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("denies inactive unlinked accounts before first-link mutation", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "inactive@acd.edu.ph",
          user_metadata: { name: "Inactive Person" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValueOnce(null);
    findUniqueUserMock.mockResolvedValueOnce({
      id: "domain-user-1",
      email: "inactive@acd.edu.ph",
      auth_user_id: null,
      is_active: false,
      name: "Provisional Inactive",
      roles: [{ role: SystemRole.STUDENT }],
    });

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=student", "student")
    );

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toBe("https://cloie.test/status/inactive");
  });

  it("allows a self-service Alumni claim on a multi-role account", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "alum@example.com",
          user_metadata: { name: "Alumni Person" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "alum@example.com",
      name: "Alumni Person",
      is_active: true,
      roles: [{ role: SystemRole.FACULTY }],
    });
    upsertUserRoleMock.mockResolvedValue({
      id: "role-2",
      user_id: "domain-user-1",
      role: SystemRole.ALUMNI,
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: null,
      roles: ["FACULTY", "ALUMNI"],
      profileGate: { status: "COMPLETE" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/select-role");

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=alumni", "alumni")
    );

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(upsertUserRoleMock).toHaveBeenCalledWith({
      where: { user_id_role: { user_id: "domain-user-1", role: SystemRole.ALUMNI } },
      update: {},
      create: { user_id: "domain-user-1", role: SystemRole.ALUMNI },
    });
    expect(response.headers.get("location")).toContain("/select-role");
  });

  it("refuses an exchanged session that is not a proven Google sign-in", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "user@acd.edu.ph",
          user_metadata: { name: "Attacker" },
        },
      },
    });
    // A code replayed from another OAuth provider: `amr: oauth` alone is not
    // Google proof, and this must be refused before any account is linked,
    // claimed, or created.
    getClaimsMock.mockResolvedValue({
      data: { claims: { amr: [{ method: "oauth" }], app_metadata: { provider: "github" } } },
      error: null,
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: null,
      email: "user@acd.edu.ph",
      name: "Provisional",
      is_active: true,
      roles: [{ role: SystemRole.FACULTY }],
    });

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=faculty", "faculty")
    );

    expect(signOutMock).toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("/status/method-mismatch");
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(createUserMock).not.toHaveBeenCalled();
    expect(createUserRoleMock).not.toHaveBeenCalled();
    expect(upsertUserRoleMock).not.toHaveBeenCalled();
  });

  it("resolves a fresh Faculty claim to the pending gate, never COMPLETE", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "user@acd.edu.ph",
          user_metadata: { name: "Faculty Person" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      name: "Faculty Person",
      is_active: true,
      roles: [{ role: SystemRole.STUDENT }],
    });
    upsertUserRoleMock.mockResolvedValue({
      id: "role-2",
      user_id: "domain-user-1",
      role: SystemRole.FACULTY,
    });
    // The stored review state travels with the account: a pending request
    // must survive the claimed-role snapshot rebuild.
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: null,
      roles: ["STUDENT", "FACULTY"],
      studentProfileId: "student-profile-1",
      alumniProfileId: null,
      industryPartnerProfileId: null,
      facultyApprovalStatus: "PENDING",
      authMethod: "google",
      profileGate: { status: "ROLE_SELECTION_REQUIRED" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/status/faculty-pending");

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=faculty", "faculty")
    );

    expect(signOutMock).not.toHaveBeenCalled();
    expect(resolvePostLoginDestinationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        profileGate: { status: "FACULTY_APPROVAL_PENDING" },
      })
    );
    expect(response.headers.get("location")).toContain("/status/faculty-pending");
  });

  it("refuses a Student self-claim on an already-linked multi-role account", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "user@acd.edu.ph",
          user_metadata: { name: "Faculty Person" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      name: "Faculty Person",
      is_active: true,
      roles: [{ role: SystemRole.FACULTY }],
    });

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=student", "student")
    );

    // Student provisioning is Secretary-only: no role is created, no name is
    // replaced, and the session is terminated with guidance.
    expect(upsertUserRoleMock).not.toHaveBeenCalled();
    expect(createUserRoleMock).not.toHaveBeenCalled();
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("/status/unprovisioned-student");
  });

  it("denies role mismatch on first link before mutation", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "faculty@acd.edu.ph",
          user_metadata: { name: "Faculty Person" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValueOnce(null);
    findUniqueUserMock.mockResolvedValueOnce({
      id: "domain-user-1",
      email: "faculty@acd.edu.ph",
      auth_user_id: null,
      is_active: true,
      name: "Provisional Faculty",
      roles: [{ role: SystemRole.FACULTY }],
    });

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=student", "student")
    );

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toContain("/status/role-mismatch");
  });

  it("registers a new Industry Partner Google holder into its onboarding, not back to registration", async () => {
    // Regression: /register/external used to bind the role-less `external`
    // intent, so a new Google holder was signed out and sent back to the page
    // they came from. The page now binds the chosen role intent, so a new
    // Google holder claims that role and enters its onboarding.
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "partner@example.com",
          user_metadata: { name: "Partner Person" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({
      id: "new-user-id",
      auth_user_id: VALID_UUID_1,
      email: "partner@example.com",
      name: "Partner Person",
      roles: [{ role: SystemRole.INDUSTRY_PARTNER }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "INDUSTRY_PARTNER",
      roles: ["INDUSTRY_PARTNER"],
      profileGate: { status: "INDUSTRY_PARTNER_ONBOARDING_REQUIRED", intent: "industry-partner" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/onboarding?intent=industry-partner");

    const response = await GET(
      callbackRequest(
        "https://cloie.test/api/auth/callback?code=abc&intent=industry-partner",
        "industry-partner"
      )
    );

    expect(signOutMock).not.toHaveBeenCalled();
    expect(createUserMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        roles: { create: { role: SystemRole.INDUSTRY_PARTNER } },
      }),
      include: { roles: true },
    });
    expect(response.headers.get("location")).toBe(
      "https://cloie.test/onboarding?intent=industry-partner"
    );
  });

  it("uses resolvePostLoginDestination for successful redirects", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "user@acd.edu.ph",
          user_metadata: { name: "Faculty Person" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      name: "Faculty Person",
      is_active: true,
      roles: [{ role: SystemRole.FACULTY }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "FACULTY",
      roles: ["FACULTY"],
      profileGate: { status: "COMPLETE" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/faculty/dashboard");

    const response = await GET(
      callbackRequest(
        "https://cloie.test/api/auth/callback?code=abc&next=%2Fdashboard&intent=faculty",
        "faculty"
      )
    );

    expect(resolvePostLoginDestinationMock).toHaveBeenCalledWith({
      requestedPath: "/dashboard",
      intent: "faculty",
      activeRole: "FACULTY",
      profileGate: { status: "COMPLETE" },
    });
    expect(resolveAuthSessionFromUserMock).toHaveBeenCalledWith({
      id: VALID_UUID_1,
      email: "user@acd.edu.ph",
    });
    expect(resolveAuthSessionMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("/faculty/dashboard");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("ignores forwarded host overrides and keeps the trusted redirect base", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://public.example");
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "user@acd.edu.ph",
          user_metadata: { name: "Faculty Person" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      name: "Faculty Person",
      is_active: true,
      roles: [{ role: SystemRole.FACULTY }],
    });
    resolvePostLoginDestinationMock.mockReturnValue("/faculty/dashboard");

    const ticketRequest = callbackRequest(
      "https://internal.example/api/auth/callback?code=abc&intent=faculty",
      "faculty"
    );
    const request = new Request(ticketRequest, {
      headers: {
        "x-forwarded-host": "app.example.com",
        cookie: ticketRequest.headers.get("cookie") ?? "",
      },
    });
    const response = await GET(request);

    expect(response.headers.get("location")).toBe("https://public.example/faculty/dashboard");
  });

  it("derives the redirect base from the Host header when accessed through a reverse proxy", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const response = await GET(
      new Request("https://localhost:3000/api/auth/callback?code=abc&intent=student", {
        headers: {
          host: "dom-pubmed-herbal-transparent.trycloudflare.com",
          "x-forwarded-proto": "https",
        },
      })
    );

    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://dom-pubmed-herbal-transparent.trycloudflare.com/"
    );
  });

  it("sanitizes malformed next values before redirecting", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "user@acd.edu.ph",
          user_metadata: { name: "Student Person" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      name: "Student Person",
      is_active: true,
      roles: [{ role: SystemRole.STUDENT }],
    });

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&next=profile")
    );

    expect(resolvePostLoginDestinationMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://cloie.test/");
  });

  it("never redirects to a raw malformed next value even with a valid ticket", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "user@acd.edu.ph",
          user_metadata: { name: "Faculty Person" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      name: "Faculty Person",
      is_active: true,
      roles: [{ role: SystemRole.FACULTY }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "FACULTY",
      roles: ["FACULTY"],
      profileGate: { status: "COMPLETE" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/faculty/dashboard");

    const response = await GET(
      callbackRequest(
        "https://cloie.test/api/auth/callback?code=abc&next=//evil.example&intent=faculty",
        "faculty"
      )
    );

    expect(resolvePostLoginDestinationMock).toHaveBeenCalledWith(
      expect.objectContaining({ requestedPath: "//evil.example" })
    );
    expect(response.headers.get("location")).toBe("https://cloie.test/faculty/dashboard");
  });

  it("assigns a self-service Faculty role to a roleless existing user", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "user@acd.edu.ph",
          user_metadata: { name: "Roleless Person" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      name: "Roleless Person",
      is_active: true,
      roles: [],
    });
    createUserRoleMock.mockResolvedValue({
      id: "role-1",
      user_id: "domain-user-1",
      role: SystemRole.FACULTY,
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "FACULTY",
      roles: ["FACULTY"],
      profileGate: { status: "FACULTY_APPROVAL_PENDING" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/status/faculty-pending");

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=faculty", "faculty")
    );

    expect(createUserRoleMock).toHaveBeenCalledWith({
      data: {
        user_id: "domain-user-1",
        role: SystemRole.FACULTY,
      },
    });
    expect(response.headers.get("location")).toBe("https://cloie.test/status/faculty-pending");
  });

  it("blocks roleless existing user claiming a pre-provisioned role", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "user@acd.edu.ph",
          user_metadata: { name: "Roleless Person" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      name: "Roleless Person",
      is_active: true,
      roles: [],
    });

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=secretary", "secretary")
    );

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toContain("/status/pre-provisioning-required");
  });

  it("blocks roleless existing user claiming a self-service role with an invalid domain", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "user@gmail.com",
          user_metadata: { name: "Roleless Person" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@gmail.com",
      name: "Roleless Person",
      is_active: true,
      roles: [],
    });

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=faculty", "faculty")
    );

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toContain("/status/invalid-domain");
  });

  it("does not mutate an unlinked roleless match that fails self-service eligibility", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "roleless@gmail.com",
          user_metadata: { name: "External Roleless" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValueOnce(null); // by auth_user_id
    findUniqueUserMock.mockResolvedValueOnce({
      // by email — unlinked, no role
      id: "domain-user-roleless",
      email: "roleless@gmail.com",
      auth_user_id: null,
      is_active: true,
      name: "Provisional Roleless",
      roles: [],
    });

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=faculty", "faculty")
    );

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(createUserMock).not.toHaveBeenCalled();
    expect(createUserRoleMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
    expect(resolveAuthSessionFromUserMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toContain("/status/invalid-domain");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("does not mutate an unlinked roleless match claiming a pre-provisioned role", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "roleless@acd.edu.ph",
          user_metadata: { name: "Would Be Secretary" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValueOnce(null);
    findUniqueUserMock.mockResolvedValueOnce({
      id: "domain-user-roleless",
      email: "roleless@acd.edu.ph",
      auth_user_id: null,
      is_active: true,
      name: "Provisional Roleless",
      roles: [],
    });

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=secretary", "secretary")
    );

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(createUserRoleMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toContain("/status/pre-provisioning-required");
  });

  it("atomically links and assigns a role for an allowed unlinked roleless Faculty claim", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "roleless@acd.edu.ph",
          user_metadata: { name: "Google Roleless" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValueOnce(null); // by auth_user_id
    findUniqueUserMock.mockResolvedValueOnce({
      // by email
      id: "domain-user-roleless",
      email: "roleless@acd.edu.ph",
      auth_user_id: null,
      is_active: true,
      name: "Provisional Roleless",
      roles: [],
    });
    updateManyUserMock.mockResolvedValue({ count: 1 });
    createUserRoleMock.mockResolvedValue({
      id: "role-1",
      user_id: "domain-user-roleless",
      role: SystemRole.FACULTY,
    });
    findUniqueUserMock.mockResolvedValueOnce({
      // re-fetch inside transaction after claim + role
      id: "domain-user-roleless",
      email: "roleless@acd.edu.ph",
      auth_user_id: VALID_UUID_1,
      is_active: true,
      name: "Google Roleless",
      roles: [{ role: SystemRole.FACULTY }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "FACULTY",
      roles: ["FACULTY"],
      profileGate: { status: "FACULTY_APPROVAL_PENDING" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/status/faculty-pending");

    const response = await GET(
      callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=faculty", "faculty")
    );

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(updateManyUserMock).toHaveBeenCalledWith({
      where: { id: "domain-user-roleless", auth_user_id: null },
      data: {
        auth_user_id: VALID_UUID_1,
        name: "Google Roleless",
      },
    });
    expect(createUserRoleMock).toHaveBeenCalledWith({
      data: {
        user_id: "domain-user-roleless",
        role: SystemRole.FACULTY,
      },
    });
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://cloie.test/status/faculty-pending");
  });

  describe("Bootstrap Secretary Path", () => {
    beforeEach(() => {
      vi.stubEnv("BOOTSTRAP_SECRETARY_EMAIL", "bootstrap-secretary@acd.edu.ph");
    });

    it("provisions a new bootstrap Secretary with the Google-derived name and no invented fallback", async () => {
      exchangeCodeForSessionMock.mockResolvedValue({
        error: null,
        data: {
          user: {
            id: VALID_UUID_1,
            email: "bootstrap-secretary@acd.edu.ph",
            user_metadata: { name: "Bootstrap Admin" },
          },
        },
      });
      findFirstUserRoleMock.mockResolvedValue(null);
      findUniqueUserMock.mockResolvedValue(null);
      createUserMock.mockResolvedValue({
        id: "new-secretary-user-id",
        auth_user_id: VALID_UUID_1,
        email: "bootstrap-secretary@acd.edu.ph",
        name: "Bootstrap Admin",
        roles: [{ role: SystemRole.SECRETARY }],
      });
      resolveAuthSessionFromUserMock.mockResolvedValue({
        activeRole: "SECRETARY",
        roles: ["SECRETARY"],
        profileGate: { status: "COMPLETE" },
      });
      resolvePostLoginDestinationMock.mockReturnValue("/secretary/dashboard");

      const response = await GET(
        callbackRequest(
          "https://cloie.test/api/auth/callback?code=abc&intent=secretary",
          "secretary"
        )
      );

      expect(createUserMock).toHaveBeenCalledWith({
        data: {
          auth_user_id: VALID_UUID_1,
          email: "bootstrap-secretary@acd.edu.ph",
          name: "Bootstrap Admin",
          roles: { create: { role: SystemRole.SECRETARY } },
        },
        include: { roles: true },
      });
      expect(response.headers.get("location")).toBe("https://cloie.test/secretary/dashboard");
    });

    it("rejects bootstrap create when provider name is missing instead of inventing a placeholder", async () => {
      exchangeCodeForSessionMock.mockResolvedValue({
        error: null,
        data: {
          user: {
            id: VALID_UUID_1,
            email: "bootstrap-secretary@acd.edu.ph",
            user_metadata: {},
          },
        },
      });
      findFirstUserRoleMock.mockResolvedValue(null);
      findUniqueUserMock.mockResolvedValue(null);

      const response = await GET(
        callbackRequest(
          "https://cloie.test/api/auth/callback?code=abc&intent=secretary",
          "secretary"
        )
      );

      expect(createUserMock).not.toHaveBeenCalled();
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(response.headers.get("location")).toBe(
        "https://cloie.test/status/missing-google-name"
      );
    });

    it("promotes an existing bootstrap email user to SECRETARY and replaces provisional name on first link", async () => {
      exchangeCodeForSessionMock.mockResolvedValue({
        error: null,
        data: {
          user: {
            id: VALID_UUID_1,
            email: "bootstrap-secretary@acd.edu.ph",
            user_metadata: { full_name: "Real Bootstrap" },
          },
        },
      });
      findFirstUserRoleMock.mockResolvedValue(null);
      findUniqueUserMock
        .mockResolvedValueOnce({
          // bootstrap tx: find by email
          id: "existing-user-id",
          email: "bootstrap-secretary@acd.edu.ph",
          auth_user_id: null,
          is_active: true,
          name: "Provisional",
          roles: [],
        })
        .mockResolvedValueOnce({
          // bootstrap tx: re-fetch after claim + role upsert
          id: "existing-user-id",
          email: "bootstrap-secretary@acd.edu.ph",
          auth_user_id: VALID_UUID_1,
          is_active: true,
          name: "Real Bootstrap",
          roles: [{ role: SystemRole.SECRETARY }],
        })
        .mockResolvedValueOnce({
          // post-bootstrap email-ownership check (same user)
          id: "existing-user-id",
          email: "bootstrap-secretary@acd.edu.ph",
          auth_user_id: VALID_UUID_1,
          is_active: true,
          name: "Real Bootstrap",
          roles: [{ role: SystemRole.SECRETARY }],
        });
      updateManyUserMock.mockResolvedValue({ count: 1 });
      resolveAuthSessionFromUserMock.mockResolvedValue({
        activeRole: "SECRETARY",
        roles: ["SECRETARY"],
        profileGate: { status: "COMPLETE" },
      });
      resolvePostLoginDestinationMock.mockReturnValue("/secretary/dashboard");

      const response = await GET(
        callbackRequest(
          "https://cloie.test/api/auth/callback?code=abc&intent=secretary",
          "secretary"
        )
      );

      expect(updateManyUserMock).toHaveBeenCalledWith({
        where: { id: "existing-user-id", auth_user_id: null },
        data: {
          auth_user_id: VALID_UUID_1,
          name: "Real Bootstrap",
        },
      });
      expect(updateUserMock).not.toHaveBeenCalled();
      expect(upsertUserRoleMock).toHaveBeenCalledWith({
        where: {
          user_id_role: { user_id: "existing-user-id", role: SystemRole.SECRETARY },
        },
        update: {},
        create: { user_id: "existing-user-id", role: SystemRole.SECRETARY },
      });
      expect(response.headers.get("location")).toBe("https://cloie.test/secretary/dashboard");
    });

    it("turns a lost bootstrap first-link race into identity-conflict", async () => {
      exchangeCodeForSessionMock.mockResolvedValue({
        error: null,
        data: {
          user: {
            id: VALID_UUID_2,
            email: "bootstrap-secretary@acd.edu.ph",
            user_metadata: { name: "Late Bootstrap" },
          },
        },
      });
      findFirstUserRoleMock.mockResolvedValue(null);
      findUniqueUserMock.mockResolvedValueOnce({
        id: "existing-user-id",
        email: "bootstrap-secretary@acd.edu.ph",
        auth_user_id: null,
        is_active: true,
        name: "Provisional",
        roles: [],
      });
      updateManyUserMock.mockResolvedValue({ count: 0 });

      const response = await GET(
        callbackRequest(
          "https://cloie.test/api/auth/callback?code=abc&intent=secretary",
          "secretary"
        )
      );

      expect(updateManyUserMock).toHaveBeenCalledWith({
        where: { id: "existing-user-id", auth_user_id: null },
        data: {
          auth_user_id: VALID_UUID_2,
          name: "Late Bootstrap",
        },
      });
      expect(upsertUserRoleMock).not.toHaveBeenCalled();
      expect(updateUserMock).not.toHaveBeenCalled();
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(response.headers.get("location")).toBe("https://cloie.test/status/identity-conflict");
    });

    it("does not bootstrap user if an admin already exists in the database", async () => {
      exchangeCodeForSessionMock.mockResolvedValue({
        error: null,
        data: {
          user: {
            id: VALID_UUID_1,
            email: "bootstrap-secretary@acd.edu.ph",
            user_metadata: { name: "Too Late" },
          },
        },
      });
      findFirstUserRoleMock.mockResolvedValue({ id: "admin-role-id", role: SystemRole.SECRETARY });
      findUniqueUserMock.mockResolvedValue(null);

      const response = await GET(
        callbackRequest(
          "https://cloie.test/api/auth/callback?code=abc&intent=secretary",
          "secretary"
        )
      );

      expect(signOutMock).toHaveBeenCalled();
      expect(response.headers.get("location")).toContain("/status/pre-provisioning-required");
    });
  });

  describe("role-less entry intents", () => {
    function entryExchange(email: string) {
      exchangeCodeForSessionMock.mockResolvedValue({
        error: null,
        data: {
          user: {
            id: VALID_UUID_1,
            email,
            user_metadata: { name: "Entry User" },
          },
        },
      });
    }

    it("sends unmatched staff entrants to provisioning guidance without creating anything", async () => {
      entryExchange("new-staff@acd.edu.ph");
      findUniqueUserMock.mockResolvedValue(null);

      const response = await GET(
        callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=staff", "staff")
      );

      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(createUserMock).not.toHaveBeenCalled();
      expect(createUserRoleMock).not.toHaveBeenCalled();
      expect(response.headers.get("location")).toBe(
        "https://cloie.test/status/pre-provisioning-required"
      );
    });

    it("sends unmatched external entrants to external registration without creating anything", async () => {
      entryExchange("new-partner@example.com");
      findUniqueUserMock.mockResolvedValue(null);

      const response = await GET(
        callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=external", "external")
      );

      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(createUserMock).not.toHaveBeenCalled();
      expect(createUserRoleMock).not.toHaveBeenCalled();
      expect(response.headers.get("location")).toBe("https://cloie.test/register/external");
    });

    it("resolves linked multi-role accounts through the session without claiming a role", async () => {
      entryExchange("linked-staff@acd.edu.ph");
      findUniqueUserMock.mockResolvedValue({
        id: "linked-user-id",
        email: "linked-staff@acd.edu.ph",
        auth_user_id: VALID_UUID_1,
        is_active: true,
        name: "Linked Staff",
        roles: [{ role: SystemRole.FACULTY }, { role: SystemRole.PROGRAM_HEAD }],
      });
      resolveAuthSessionFromUserMock.mockResolvedValue({
        userId: "linked-user-id",
        activeRole: "FACULTY",
        roles: ["FACULTY", "PROGRAM_HEAD"],
        profileGate: { status: "COMPLETE" },
      });

      const response = await GET(
        callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=staff", "staff")
      );

      expect(signOutMock).not.toHaveBeenCalled();
      expect(response.headers.get("location")).toBe("https://cloie.test/select-role");
    });
  });
});
