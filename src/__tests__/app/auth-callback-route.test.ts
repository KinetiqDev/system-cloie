import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@prisma/client";
import {
  createLegalAcknowledgementTicket,
  LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME,
} from "@/features/legal/services/legal-acknowledgement-ticket";

const {
  exchangeCodeForSessionMock,
  signOutMock,
  resolveAuthSessionMock,
  resolveAuthSessionFromUserMock,
  resolvePostLoginDestinationMock,
  findUniqueUserMock,
  updateUserMock,
  createUserMock,
  createUserRoleMock,
  findFirstUserRoleMock,
  upsertUserRoleMock,
  transactionMock,
} = vi.hoisted(() => ({
  exchangeCodeForSessionMock: vi.fn(),
  signOutMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  resolveAuthSessionFromUserMock: vi.fn(),
  resolvePostLoginDestinationMock: vi.fn(),
  findUniqueUserMock: vi.fn(),
  updateUserMock: vi.fn(),
  createUserMock: vi.fn(),
  createUserRoleMock: vi.fn(),
  findFirstUserRoleMock: vi.fn(),
  upsertUserRoleMock: vi.fn(),
  transactionMock: vi.fn(async (callback) => {
    const tx = {
      user: {
        update: updateUserMock,
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

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueUserMock,
      update: updateUserMock,
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
    resolvePostLoginDestinationMock.mockReturnValue("/student/dashboard");
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: "STUDENT",
      profileGate: { status: "COMPLETE" },
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "STUDENT",
      profileGate: { status: "COMPLETE" },
    });
  });

  function callbackRequest(url: string, intent?: string) {
    return new Request(url, {
      headers: intent
        ? { cookie: `${LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME}=${createLegalAcknowledgementTicket(intent as never)}` }
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
      data: { user: { id: VALID_UUID_1, email: "user@gmail.com" } },
    });
    findUniqueUserMock.mockResolvedValue(null); // not found

    const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=student", "student"));

    expect(signOutMock).toHaveBeenCalledTimes(1);
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

  it("redirects existing users with no intent to their stored role dashboard", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: { user: { id: VALID_UUID_1, email: "user@acd.edu.ph" } },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      roles: [{ role: SystemRole.FACULTY }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "FACULTY",
      profileGate: { status: "COMPLETE" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/faculty/dashboard");

    const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc"));

    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://cloie.test/");
  });

  it("links an existing unlinked admin-created user by normalized email and does not overwrite name", async () => {
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
    // First lookup by auth_user_id finds nothing
    findUniqueUserMock.mockResolvedValueOnce(null);
    // Second lookup by email finds unlinked user
    findUniqueUserMock.mockResolvedValueOnce({
      id: "domain-user-1",
      email: "unlinked@acd.edu.ph",
      first_name: "AdminFirst",
      last_name: "AdminLast",
      roles: [{ role: SystemRole.FACULTY }],
    });
    // Mock the update action
    updateUserMock.mockResolvedValue({
      id: "domain-user-1",
      email: "unlinked@acd.edu.ph",
      auth_user_id: VALID_UUID_1,
      first_name: "AdminFirst",
      last_name: "AdminLast",
      roles: [{ role: SystemRole.FACULTY }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "FACULTY",
      profileGate: { status: "COMPLETE" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/faculty/dashboard");

    const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=faculty", "faculty"));

    expect(updateUserMock).toHaveBeenCalledWith({
      where: { id: "domain-user-1" },
      data: {
        auth_user_id: VALID_UUID_1,
        first_name: "AdminFirst",
        last_name: "AdminLast",
      },
      include: { roles: true },
    });
    expect(response.headers.get("location")).toBe("https://cloie.test/faculty/dashboard");
  });

  it("parses full_name into first and last names when given_name is absent (Supabase Google OAuth)", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "jane@example.com",
          user_metadata: { full_name: "Jane Doe", name: "Jane Doe" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({
      id: "new-user-id",
      auth_user_id: VALID_UUID_1,
      email: "jane@example.com",
      first_name: "Jane",
      last_name: "Doe",
      roles: [{ role: SystemRole.ALUMNI }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "ALUMNI",
      profileGate: { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/onboarding?intent=alumni");

    const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=alumni", "alumni"));

    expect(createUserMock).toHaveBeenCalledWith({
      data: {
        auth_user_id: VALID_UUID_1,
        email: "jane@example.com",
        first_name: "Jane",
        last_name: "Doe",
        roles: { create: { role: SystemRole.ALUMNI } },
      },
      include: { roles: true },
    });
    expect(response.headers.get("location")).toBe("https://cloie.test/onboarding?intent=alumni");
  });

  it("handles single-word full_name by putting it all in first_name and leaving last_name empty", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: VALID_UUID_1,
          email: "madonna@example.com",
          user_metadata: { full_name: "Madonna" },
        },
      },
    });
    findUniqueUserMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({
      id: "new-user-id",
      auth_user_id: VALID_UUID_1,
      email: "madonna@example.com",
      first_name: "Madonna",
      last_name: "",
      roles: [{ role: SystemRole.ALUMNI }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "ALUMNI",
      profileGate: { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/onboarding?intent=alumni");

    const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=alumni", "alumni"));

    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          first_name: "Madonna",
          last_name: "",
        }),
      })
    );
    expect(response.headers.get("location")).toBe("https://cloie.test/onboarding?intent=alumni");
  });

  it("redirects to role mismatch page when the intent does not match the stored role", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: { user: { id: VALID_UUID_1, email: "user@acd.edu.ph" } },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      roles: [{ role: SystemRole.FACULTY }],
    });

    const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=student", "student"));

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toContain("/status/role-mismatch");
  });

  it("uses resolvePostLoginDestination for successful redirects", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: { user: { id: VALID_UUID_1, email: "user@acd.edu.ph" } },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      roles: [{ role: SystemRole.FACULTY }],
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "FACULTY",
      profileGate: { status: "COMPLETE" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/faculty/dashboard");

    const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc&next=%2Fdashboard&intent=faculty", "faculty"));

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
  });

  it("ignores forwarded host overrides and keeps the trusted redirect base", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://public.example");
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: { user: { id: VALID_UUID_1, email: "user@acd.edu.ph" } },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      roles: [{ role: SystemRole.FACULTY }],
    });
    resolvePostLoginDestinationMock.mockReturnValue("/faculty/dashboard");

    const ticketRequest = callbackRequest(
      "https://internal.example/api/auth/callback?code=abc&intent=faculty",
      "faculty"
    );
    const request = new Request(ticketRequest, {
      headers: { "x-forwarded-host": "app.example.com", cookie: ticketRequest.headers.get("cookie") ?? "" },
    });
    const response = await GET(request);

    expect(response.headers.get("location")).toBe("https://public.example/faculty/dashboard");
  });

  it("sanitizes malformed next values before redirecting", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: { user: { id: VALID_UUID_1, email: "user@acd.edu.ph" } },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      roles: [{ role: SystemRole.STUDENT }],
    });

    const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc&next=profile"));

    expect(resolvePostLoginDestinationMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://cloie.test/");
  });

  it("assigns role to roleless existing user when they log in with a valid self-service intent", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: { user: { id: VALID_UUID_1, email: "user@acd.edu.ph" } },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      roles: [],
    });
    createUserRoleMock.mockResolvedValue({
      id: "role-1",
      user_id: "domain-user-1",
      role: SystemRole.STUDENT,
    });
    resolveAuthSessionFromUserMock.mockResolvedValue({
      activeRole: "STUDENT",
      profileGate: { status: "STUDENT_ONBOARDING_REQUIRED", intent: "student" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/onboarding?intent=student");

    const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=student", "student"));

    expect(createUserRoleMock).toHaveBeenCalledWith({
      data: {
        user_id: "domain-user-1",
        role: SystemRole.STUDENT,
      },
    });
    expect(response.headers.get("location")).toBe("https://cloie.test/onboarding?intent=student");
  });

  it("blocks roleless existing user claiming a pre-provisioned role", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: { user: { id: VALID_UUID_1, email: "user@acd.edu.ph" } },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@acd.edu.ph",
      roles: [],
    });

    const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=secretary", "secretary"));

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toContain("/status/pre-provisioning-required");
  });

  it("blocks roleless existing user claiming a self-service role with an invalid domain", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: null,
      data: { user: { id: VALID_UUID_1, email: "user@gmail.com" } },
    });
    findUniqueUserMock.mockResolvedValue({
      id: "domain-user-1",
      auth_user_id: VALID_UUID_1,
      email: "user@gmail.com",
      roles: [],
    });

    const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=student", "student"));

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toContain("/status/invalid-domain");
  });

  describe("Bootstrap Secretary Path", () => {
    beforeEach(() => {
      vi.stubEnv("BOOTSTRAP_SECRETARY_EMAIL", "bootstrap-secretary@acd.edu.ph");
    });

    it("automatically provisions new user as SECRETARY when email matches bootstrap email and no admin exists", async () => {
      exchangeCodeForSessionMock.mockResolvedValue({
        error: null,
        data: { user: { id: VALID_UUID_1, email: "bootstrap-secretary@acd.edu.ph" } },
      });
      // No admin exists in the database
      findFirstUserRoleMock.mockResolvedValue(null);
      // No existing user found by email
      findUniqueUserMock.mockResolvedValue(null);
      // Mock user creation
      createUserMock.mockResolvedValue({
        id: "new-secretary-user-id",
        auth_user_id: VALID_UUID_1,
        email: "bootstrap-secretary@acd.edu.ph",
        first_name: "System",
        last_name: "Secretary",
        roles: [{ role: SystemRole.SECRETARY }],
      });
      resolveAuthSessionFromUserMock.mockResolvedValue({
        activeRole: "SECRETARY",
        profileGate: { status: "COMPLETE" },
      });
      resolvePostLoginDestinationMock.mockReturnValue("/secretary/dashboard");

      const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=secretary", "secretary"));

      expect(createUserMock).toHaveBeenCalled();
      expect(response.headers.get("location")).toBe("https://cloie.test/secretary/dashboard");
    });

    it("automatically promotes existing user to SECRETARY when email matches bootstrap email and no admin exists", async () => {
      exchangeCodeForSessionMock.mockResolvedValue({
        error: null,
        data: { user: { id: VALID_UUID_1, email: "bootstrap-secretary@acd.edu.ph" } },
      });
      // No admin exists in the database
      findFirstUserRoleMock.mockResolvedValue(null);
      // User already exists by email (pre-created or signed up with other role)
      findUniqueUserMock
        .mockResolvedValueOnce({
          id: "existing-user-id",
          email: "bootstrap-secretary@acd.edu.ph",
        })
        .mockResolvedValueOnce({
          id: "existing-user-id",
          email: "bootstrap-secretary@acd.edu.ph",
          roles: [{ role: SystemRole.SECRETARY }],
        });
      // Mock update and upsert role inside transaction
      updateUserMock.mockResolvedValue({
        id: "existing-user-id",
        auth_user_id: VALID_UUID_1,
        email: "bootstrap-secretary@acd.edu.ph",
        roles: [{ role: SystemRole.SECRETARY }],
      });
      resolveAuthSessionFromUserMock.mockResolvedValue({
        activeRole: "SECRETARY",
        profileGate: { status: "COMPLETE" },
      });
      resolvePostLoginDestinationMock.mockReturnValue("/secretary/dashboard");

      const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=secretary", "secretary"));

      expect(updateUserMock).toHaveBeenCalled();
      expect(upsertUserRoleMock).toHaveBeenCalled();
      expect(response.headers.get("location")).toBe("https://cloie.test/secretary/dashboard");
    });

    it("does not bootstrap user if an admin already exists in the database", async () => {
      exchangeCodeForSessionMock.mockResolvedValue({
        error: null,
        data: { user: { id: VALID_UUID_1, email: "bootstrap-secretary@acd.edu.ph" } },
      });
      // An admin already exists in the database
      findFirstUserRoleMock.mockResolvedValue({ id: "admin-role-id", role: SystemRole.SECRETARY });
      // Normal signup logic falls through, which will block new admin signup
      findUniqueUserMock.mockResolvedValue(null);

      const response = await GET(callbackRequest("https://cloie.test/api/auth/callback?code=abc&intent=secretary", "secretary"));

      expect(signOutMock).toHaveBeenCalled();
      expect(response.headers.get("location")).toContain("/status/pre-provisioning-required");
    });
  });
});
