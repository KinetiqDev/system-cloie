/**
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  confirmPasswordRecovery,
  registerExternalAccount,
  requestExternalEmailContinue,
  requestPasswordRecovery,
  resendVerificationCode,
  signInExternalParticipant,
  verifyExternalCode,
} from "@/lib/actions/external-entry-actions";

const {
  supabaseMocks,
  redirectMock,
  cookieSetMock,
  cookieGetMock,
  resolveDestinationMock,
  writeActiveRoleCookieMock,
  findUniqueMock,
  updateManyMock,
  createUserMock,
  createUserRoleMock,
} = vi.hoisted(() => ({
  supabaseMocks: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    verifyOtp: vi.fn(),
    resend: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
    getClaims: vi.fn(),
  },
  redirectMock: vi.fn(),
  cookieSetMock: vi.fn(),
  cookieGetMock: vi.fn(),
  resolveDestinationMock: vi.fn(),
  writeActiveRoleCookieMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateManyMock: vi.fn(),
  createUserMock: vi.fn(),
  createUserRoleMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

vi.mock("@/features/entry/services/resolve-external-post-verification-destination", () => ({
  resolveExternalPostVerificationDestination: resolveDestinationMock,
}));

vi.mock("@/features/auth/services/active-role-cookie", () => ({
  writeActiveRoleCookie: writeActiveRoleCookieMock,
  readActiveRoleCookie: vi.fn(async () => null),
  ACTIVE_ROLE_COOKIE_NAME: "cloie_active_role",
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: cookieGetMock,
    set: cookieSetMock,
    delete: vi.fn(),
  })),
}));

vi.mock("@/features/legal/services/require-legal-acknowledgement", () => ({
  requireLegalAcknowledgement: vi.fn(async () => ({ acknowledged: true })),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (tx: typeof prismaMockTx) => unknown) =>
      callback(prismaMockTx)
    ),
  },
}));

const prismaMockTx = {
  user: {
    findUnique: findUniqueMock,
    updateMany: updateManyMock,
    create: createUserMock,
  },
  userRole: {
    create: createUserRoleMock,
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: supabaseMocks.signInWithPassword,
      signUp: supabaseMocks.signUp,
      verifyOtp: supabaseMocks.verifyOtp,
      resend: supabaseMocks.resend,
      resetPasswordForEmail: supabaseMocks.resetPasswordForEmail,
      updateUser: supabaseMocks.updateUser,
      signOut: supabaseMocks.signOut,
      getClaims: supabaseMocks.getClaims,
    },
  })),
}));

vi.mock("@/features/auth/services/signup-session-proof", () => ({
  rememberVerifiedSignupSession: vi.fn(),
}));

describe("external entry actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "auth-1",
          session_id: "signup-session",
          exp: 2_000_000_000,
          amr: [{ method: "otp" }],
        },
      },
      error: null,
    });
  });

  it("email-first Continue always advances on a valid email", async () => {
    const result = await requestExternalEmailContinue({ email: "someone@example.com" });
    expect(result.success).toBe(true);
  });

  it("email-first Continue rejects a malformed email without probing", async () => {
    const result = await requestExternalEmailContinue({ email: "not-an-email" });
    expect(result).toEqual({ success: false, error: "Enter a valid email address to continue." });
  });

  it("password sign-in collapses provider mismatch into one message", async () => {
    supabaseMocks.signInWithPassword.mockResolvedValue({ error: new Error("Invalid login") });
    const result = await signInExternalParticipant({
      email: "someone@example.com",
      password: "wrong-password",
    });
    expect(result.success).toBe(false);
    expect(result).toEqual({
      success: false,
      error:
        "Those credentials did not match. Try again, reset your password, or continue with Google.",
    });
  });

  it("registration pins the address and hands off to the code step on an absorbed signup", async () => {
    supabaseMocks.signUp.mockResolvedValue({ error: new Error("User already registered") });
    await registerExternalAccount({
      name: "Amara Reyes",
      email: "amara@example.com",
      password: "correct-horse-9",
      role: "ALUMNI",
    });
    expect(supabaseMocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "amara@example.com",
        options: expect.objectContaining({
          data: expect.objectContaining({ display_name: "Amara Reyes", requested_role: "ALUMNI" }),
        }),
      })
    );
    expect(cookieSetMock).toHaveBeenCalledWith(
      "cloie_pending_verify_email",
      "amara@example.com",
      expect.objectContaining({ httpOnly: true, path: "/verify-email" })
    );
    // The chosen role has to survive the code step, or verification cannot
    // route the account into the onboarding that collects its real fields.
    expect(cookieSetMock).toHaveBeenCalledWith(
      "cloie_pending_external_role",
      "ALUMNI",
      expect.objectContaining({ httpOnly: true, path: "/verify-email" })
    );
    expect(redirectMock).toHaveBeenCalledWith("/verify-email");
  });

  it("registration answers neutrally when the transport throws", async () => {
    supabaseMocks.signUp.mockRejectedValue(new Error("smtp down"));
    await registerExternalAccount({
      name: "Bela Santos",
      email: "bela@example.com",
      password: "correct-horse-9",
      role: "INDUSTRY_PARTNER",
    });
    expect(redirectMock).toHaveBeenCalledWith("/verify-email");
  });

  it("registration rejects an email-derived-name shortcut (name required)", async () => {
    const result = await registerExternalAccount({
      name: "",
      email: "amara@example.com",
      password: "correct-horse-9",
      role: "ALUMNI",
    });
    expect(result.success).toBe(false);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("code verification rejects a non-6-digit token before any provider call", async () => {
    const result = await verifyExternalCode({ email: "amara@example.com", token: "123" });
    expect(result.success).toBe(false);
    expect(supabaseMocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("a verified code releases the pins and continues into the chosen onboarding", async () => {
    supabaseMocks.verifyOtp.mockResolvedValue({
      error: null,
      data: { user: { id: "auth-1", identities: [{ provider: "email" }] } },
    });
    cookieGetMock.mockImplementation((name: string) => {
      if (name === "cloie_pending_external_role") return { value: "INDUSTRY_PARTNER" };
      if (name === "cloie_pending_verify_email") return { value: "dara@example.com" };
      return undefined;
    });
    // The verified address belongs to an unlinked, roleless external account
    // that this password identity is allowed to claim.
    findUniqueMock.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
      "auth_user_id" in where
        ? null
        : {
            id: "external-user-1",
            email: "dara@example.com",
            name: "Dara Santos",
            auth_user_id: null,
            roles: [],
          }
    );
    updateManyMock.mockResolvedValue({ count: 1 });
    resolveDestinationMock.mockResolvedValue({
      activeRole: "INDUSTRY_PARTNER",
      path: "/onboarding?intent=industry-partner",
    });

    const result = await verifyExternalCode({ email: "dara@example.com", token: "123456" });

    expect(result.success).toBe(true);
    // The role the person registered for is what the verified identity is
    // granted — not a default and not a role-less account.
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ auth_user_id: "auth-1" }),
      })
    );
    expect(createUserRoleMock).toHaveBeenCalledWith({
      data: { user_id: "external-user-1", role: "INDUSTRY_PARTNER" },
    });
    expect(cookieSetMock).toHaveBeenCalledWith(
      "cloie_pending_verify_email",
      "",
      expect.objectContaining({ maxAge: 0, path: "/verify-email" })
    );
    expect(cookieSetMock).toHaveBeenCalledWith(
      "cloie_pending_external_role",
      "",
      expect.objectContaining({ maxAge: 0, path: "/verify-email" })
    );
    // The verified person must land in their role's real onboarding, not stay
    // on the code step holding an account they cannot use.
    expect(writeActiveRoleCookieMock).toHaveBeenCalledWith("INDUSTRY_PARTNER");
    expect(redirectMock).toHaveBeenCalledWith("/onboarding?intent=industry-partner");
  });

  it("does not give a verified address the role from another pending registration", async () => {
    supabaseMocks.verifyOtp.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: "auth-first",
          email: "first@example.com",
          identities: [{ provider: "email" }],
          user_metadata: { display_name: "First Holder", requested_role: "ALUMNI" },
        },
      },
    });
    cookieGetMock.mockImplementation((name: string) => {
      if (name === "cloie_pending_external_role") return { value: "INDUSTRY_PARTNER" };
      if (name === "cloie_pending_verify_email") return { value: "second@example.com" };
      return undefined;
    });
    findUniqueMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({ id: "first-domain" });
    resolveDestinationMock.mockResolvedValue(null);

    await verifyExternalCode({ email: "first@example.com", token: "123456" });

    expect(createUserMock).toHaveBeenCalledWith({
      data: {
        auth_user_id: "auth-first",
        email: "first@example.com",
        name: "First Holder",
        roles: { create: { role: "ALUMNI" } },
      },
      select: { id: true },
    });
  });

  it("keeps the neutral completion message when no session resolves for the verified identity", async () => {
    supabaseMocks.verifyOtp.mockResolvedValue({
      error: null,
      data: { user: { id: "auth-2", identities: [{ provider: "email" }] } },
    });
    resolveDestinationMock.mockResolvedValue(null);

    const result = await verifyExternalCode({ email: "dara@example.com", token: "123456" });

    expect(result.success).toBe(true);
    expect(writeActiveRoleCookieMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("resend answers neutrally even when the provider throws", async () => {
    supabaseMocks.resend.mockRejectedValue(new Error("rate limited"));
    const result = await resendVerificationCode({ email: "amara@example.com" });
    expect(result.success).toBe(true);
  });

  it("recovery request answers neutrally even when the provider throws", async () => {
    supabaseMocks.resetPasswordForEmail.mockRejectedValue(new Error("smtp down"));
    const result = await requestPasswordRecovery({ email: "amara@example.com" });
    expect(result.success).toBe(true);
  });

  it("recovery confirmation rejects mismatched passwords before any provider call", async () => {
    const result = await confirmPasswordRecovery({
      email: "amara@example.com",
      token: "123456",
      newPassword: "new-password-9",
      confirmPassword: "different-password-9",
    });
    expect(result.success).toBe(false);
    expect(supabaseMocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("recovery confirmation ends the recovery session after a password update", async () => {
    supabaseMocks.verifyOtp.mockResolvedValue({ error: null });
    supabaseMocks.updateUser.mockResolvedValue({ error: null });
    const result = await confirmPasswordRecovery({
      email: "amara@example.com",
      token: "123456",
      newPassword: "new-password-9",
      confirmPassword: "new-password-9",
    });
    expect(result.success).toBe(true);
    expect(supabaseMocks.signOut).toHaveBeenCalled();
  });

  it.each(["rejected", "thrown"])(
    "ends the recovery session when the password update is %s",
    async (failure) => {
      supabaseMocks.verifyOtp.mockResolvedValue({ error: null });
      supabaseMocks.signOut.mockResolvedValue({ error: null });
      if (failure === "rejected") {
        supabaseMocks.updateUser.mockResolvedValue({ error: new Error("Password rejected") });
      } else {
        supabaseMocks.updateUser.mockRejectedValue(new Error("Transport failed"));
      }

      const result = await confirmPasswordRecovery({
        email: "recovering@example.com",
        token: "123456",
        newPassword: "new-password-9",
        confirmPassword: "new-password-9",
      });

      expect(result.success).toBe(false);
      expect(supabaseMocks.signOut).toHaveBeenCalledTimes(1);
    }
  );
});
