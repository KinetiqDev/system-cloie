/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement, Fragment } from "react";
import { SystemRole } from "@prisma/client";
import {
  createLegalAcknowledgementTicket,
  LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME,
} from "@/features/legal/services/legal-acknowledgement-ticket";

const {
  findUser,
  getClaims,
  exchangeCode,
  signOut,
  updateUser,
  selectedRole,
  findAffiliation,
  linkUser,
} = vi.hoisted(() => ({
  findUser: vi.fn(),
  getClaims: vi.fn(),
  exchangeCode: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
  selectedRole: vi.fn(),
  findAffiliation: vi.fn(),
  linkUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: selectedRole })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: exchangeCode,
      getUser: vi.fn(async () => ({
        data: { user: { id: "auth-faculty-1", email: "faculty@acd.edu.ph" } },
        error: null,
      })),
      getClaims,
      signOut,
    },
  })),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: findUser, update: updateUser, updateMany: linkUser },
    facultyProgramAffiliation: { findFirst: findAffiliation },
  },
}));

import { GET } from "@/app/api/auth/callback/route";
import { SessionGuard } from "@/features/auth/components/session-guard";
import { AuthenticatedAppShell } from "@/features/auth/components/authenticated-app-shell";
import DashboardPage from "@/app/(app)/dashboard/page";
import SelectRolePage from "@/app/(app)/select-role/page";

beforeEach(() => {
  vi.clearAllMocks();
  selectedRole.mockReturnValue(undefined);
  findAffiliation.mockResolvedValue({ id: "affiliation-1" });
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

it.each([false, true])(
  "keeps a Google-authenticated Faculty and GenEd coordinator at workspace selection, first link: %s",
  async (firstLink) => {
    const account = {
      id: "faculty-1",
      auth_user_id: "auth-faculty-1",
      email: "faculty@acd.edu.ph",
      name: "Faculty Holder",
      is_active: true,
      roles: [{ role: "FACULTY" }, { role: "GEN_ED_COORDINATOR" }],
      student_profile: null,
      alumni_profile: null,
      industry_partner_profile: null,
      faculty_access_request_owned: null,
    };
    findUser.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if (firstLink && where.auth_user_id) return null;
      return { ...account, auth_user_id: firstLink ? null : account.auth_user_id };
    });
    linkUser.mockImplementation(async () => {
      firstLink = false;
      return { count: 1 };
    });
    exchangeCode.mockResolvedValue({
      data: {
        user: {
          id: "auth-faculty-1",
          email: "faculty@acd.edu.ph",
          user_metadata: { name: "Faculty Holder" },
        },
      },
      error: null,
    });

    const response = await GET(
      new Request("https://cloie.test/api/auth/callback?code=valid-code&intent=staff", {
        headers: {
          cookie: `${LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME}=${createLegalAcknowledgementTicket("staff")}`,
        },
      })
    );

    expect(response.headers.get("location")).toBe("https://cloie.test/select-role");
    expect(signOut).not.toHaveBeenCalled();
    const children = createElement("div", null, "Choose your workspace");
    const shell = await AuthenticatedAppShell({ children });
    expect(shell.type).toBe(SessionGuard);
    await expect(SessionGuard(shell.props)).resolves.toEqual(
      createElement(Fragment, null, shell.props.children)
    );
    await expect(SelectRolePage()).resolves.toBeDefined();
    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/select-role");
  }
);

it.each([undefined, "SECRETARY", "invalid-role"])(
  "allows workspace selection with a missing or stale active role %s",
  async (cookieRole) => {
    selectedRole.mockReturnValue(cookieRole ? { value: cookieRole } : undefined);
    findUser.mockResolvedValue({
      id: "faculty-1",
      auth_user_id: "auth-faculty-1",
      email: "faculty@acd.edu.ph",
      name: "Staff Holder",
      is_active: true,
      roles: [{ role: SystemRole.DEAN }, { role: SystemRole.GEN_ED_COORDINATOR }],
    });
    const children = createElement("div", null, "Choose your workspace");

    await expect(SessionGuard({ children, allowRoleSelection: true })).resolves.toEqual(
      createElement(Fragment, null, children)
    );
  }
);

it("opens a selected coordinator workspace without Faculty affiliation", async () => {
  selectedRole.mockReturnValue({ value: SystemRole.GEN_ED_COORDINATOR });
  findAffiliation.mockResolvedValue(null);
  findUser.mockResolvedValue({
    id: "faculty-1",
    auth_user_id: "auth-faculty-1",
    email: "faculty@acd.edu.ph",
    name: "Faculty Holder",
    is_active: true,
    roles: [{ role: SystemRole.FACULTY }, { role: SystemRole.GEN_ED_COORDINATOR }],
  });

  const children = createElement("div", null, "Coordinator workspace");
  await expect(
    SessionGuard({ children, allowedRoles: [SystemRole.GEN_ED_COORDINATOR] })
  ).resolves.toEqual(createElement(Fragment, null, children));
});
