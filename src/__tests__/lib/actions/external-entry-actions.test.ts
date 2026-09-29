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

const { supabaseMocks, redirectMock, cookieSetMock, cookieGetMock } = vi.hoisted(() => ({
  supabaseMocks: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    verifyOtp: vi.fn(),
    resend: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  },
  redirectMock: vi.fn(),
  cookieSetMock: vi.fn(),
  cookieGetMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

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
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
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
    },
  })),
}));

describe("external entry actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("a verified code releases the pinned address", async () => {
    supabaseMocks.verifyOtp.mockResolvedValue({ error: null, data: { user: { id: "auth-1" } } });
    const result = await verifyExternalCode({ email: "dara@example.com", token: "123456" });
    expect(result.success).toBe(true);
    expect(cookieSetMock).toHaveBeenCalledWith(
      "cloie_pending_verify_email",
      "",
      expect.objectContaining({ maxAge: 0, path: "/verify-email" })
    );
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
});
