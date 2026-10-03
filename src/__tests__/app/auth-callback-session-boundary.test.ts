/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  createLegalAcknowledgementTicket,
  LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME,
} from "@/features/legal/services/legal-acknowledgement-ticket";

const { findUser, getClaims, exchangeCode, signOut, updateUser } = vi.hoisted(() => ({
  findUser: vi.fn(),
  getClaims: vi.fn(),
  exchangeCode: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: exchangeCode,
      getClaims,
      signOut,
    },
  })),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: findUser, update: updateUser },
    facultyProgramAffiliation: { findFirst: vi.fn(async () => ({ id: "affiliation-1" })) },
  },
}));

import { GET } from "@/app/api/auth/callback/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://cloie.test");
  vi.stubEnv("CLOIE_LEGAL_TICKET_SECRET", "legal-ticket-test-secret-012345678901");
  getClaims.mockResolvedValue({
    data: { claims: { amr: [{ method: "oauth" }], app_metadata: { provider: "google" } } },
    error: null,
  });
  exchangeCode.mockResolvedValue({
    data: { user: { id: "auth-faculty-1", email: "faculty@acd.edu.ph" } },
    error: null,
  });
  findUser.mockResolvedValue({
    id: "faculty-1",
    auth_user_id: "auth-faculty-1",
    email: "faculty@acd.edu.ph",
    name: "Faculty Holder",
    is_active: true,
    roles: [{ role: "FACULTY" }],
    student_profile: null,
    alumni_profile: null,
    industry_partner_profile: null,
    faculty_access_request_owned: null,
  });
});

afterEach(() => vi.unstubAllEnvs());

it("opens a returning Faculty holder's workspace using the verified Google session", async () => {
  const response = await GET(
    new Request("https://cloie.test/api/auth/callback?code=valid-code&intent=staff", {
      headers: {
        cookie: `${LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME}=${createLegalAcknowledgementTicket("staff")}`,
      },
    })
  );

  expect(response.headers.get("location")).toBe("https://cloie.test/faculty/dashboard");
  expect(signOut).not.toHaveBeenCalled();
  expect(updateUser).not.toHaveBeenCalled();
});
