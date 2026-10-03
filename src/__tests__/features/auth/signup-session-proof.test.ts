/** @vitest-environment node */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  rememberVerifiedSignupSession,
  SIGNUP_SESSION_COOKIE_NAME,
  verifySignupSessionProof,
} from "@/features/auth/services/signup-session-proof";
import { resolveAuthSessionFromUser } from "@/features/auth/services/resolve-auth-session";

const { storedCookies, findUser } = vi.hoisted(() => ({
  storedCookies: new Map<string, string>(),
  findUser: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      storedCookies.has(name) ? { value: storedCookies.get(name) } : undefined,
    set: (name: string, value: string) => storedCookies.set(name, value),
  })),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { user: { findUnique: findUser } },
}));

const claims = {
  sub: "external-auth",
  session_id: "signup-session",
  exp: 2_000_000_000,
  amr: [{ method: "otp" }],
};

beforeEach(() => {
  storedCookies.clear();
  vi.stubEnv("CLOIE_LEGAL_TICKET_SECRET", "signup-session-proof-secret-012345678901");
  findUser.mockResolvedValue({
    id: "external-domain",
    auth_user_id: "external-auth",
    email: "external@example.test",
    name: "External Holder",
    is_active: true,
    roles: [{ role: "ALUMNI" }],
    alumni_profile: { id: "alumni-profile", verification_status: "APPROVED" },
    industry_partner_profile: null,
    student_profile: null,
    faculty_access_request_owned: null,
  });
});
afterEach(() => vi.unstubAllEnvs());

it("allows signup onboarding only for the exact session the application verified", async () => {
  const user = { id: claims.sub, email: "external@example.test", claims };
  expect((await resolveAuthSessionFromUser(user)).profileGate.status).toBe("AUTH_METHOD_MISMATCH");
  await rememberVerifiedSignupSession(claims);
  expect((await resolveAuthSessionFromUser(user)).profileGate.status).toBe("COMPLETE");
  expect(
    (
      await resolveAuthSessionFromUser({
        ...user,
        claims: { ...claims, session_id: "recovery-session" },
      })
    ).profileGate.status
  ).toBe("AUTH_METHOD_MISMATCH");
});

it("rejects forged, expired and other-account signup proofs", async () => {
  await rememberVerifiedSignupSession(claims);
  const proof = storedCookies.get(SIGNUP_SESSION_COOKIE_NAME)!;
  expect(verifySignupSessionProof(`${proof}x`, claims)).toBe(false);
  expect(verifySignupSessionProof(proof, { ...claims, sub: "other-auth" })).toBe(false);
  const now = Math.floor(Date.now() / 1000);
  const clock = vi.spyOn(Date, "now").mockReturnValue((now + 3601) * 1000);
  expect(verifySignupSessionProof(proof, claims)).toBe(false);
  clock.mockRestore();
});

it("does not issue signup proof for password or unproved session claims", async () => {
  await expect(
    rememberVerifiedSignupSession({ ...claims, amr: [{ method: "password" }] })
  ).rejects.toThrow("proof is unavailable");
  await expect(rememberVerifiedSignupSession({ ...claims, session_id: undefined })).rejects.toThrow(
    "proof is unavailable"
  );
  expect(storedCookies.has(SIGNUP_SESSION_COOKIE_NAME)).toBe(false);
});
