/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@prisma/client";
import { resolveExternalPostVerificationDestination } from "@/features/entry/services/resolve-external-post-verification-destination";

const { findUserMock, readRoleMock } = vi.hoisted(() => ({
  findUserMock: vi.fn(),
  readRoleMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { user: { findUnique: findUserMock } },
}));
vi.mock("@/features/auth/services/active-role-cookie", () => ({
  readActiveRoleCookie: readRoleMock,
}));

function externalAccount() {
  return {
    id: "external-account",
    email: "person@example.com",
    name: "External Person",
    auth_user_id: "verified-identity",
    is_active: true,
    roles: [{ role: SystemRole.ALUMNI }, { role: SystemRole.INDUSTRY_PARTNER }],
    student_profile: null,
    alumni_profile: { id: "alumni-profile", verification_status: "VERIFIED" },
    industry_partner_profile: null,
    faculty_access_request_owned: null,
  };
}

describe("external post-verification destination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readRoleMock.mockResolvedValue(null);
    findUserMock.mockResolvedValue(externalAccount());
  });

  it.each([SystemRole.ALUMNI, null])(
    "opens the chosen onboarding when the previous active role is %s",
    async (previousRole) => {
      readRoleMock.mockResolvedValue(previousRole);
      expect(
        await resolveExternalPostVerificationDestination(
          "verified-identity",
          SystemRole.INDUSTRY_PARTNER
        )
      ).toEqual({
        activeRole: SystemRole.INDUSTRY_PARTNER,
        path: "/onboarding?intent=industry-partner",
      });
    }
  );

  it.each([
    { isActive: false, verificationStatus: "VERIFIED", path: "/status/inactive" },
    { isActive: true, verificationStatus: "REJECTED", path: "/status/rejected" },
  ])(
    "preserves the $path gate after role selection",
    async ({ isActive, verificationStatus, path }) => {
      const account = externalAccount();
      findUserMock.mockResolvedValue({
        ...account,
        is_active: isActive,
        industry_partner_profile: {
          id: "partner-profile",
          verification_status: verificationStatus,
        },
      });

      expect(
        await resolveExternalPostVerificationDestination(
          "verified-identity",
          SystemRole.INDUSTRY_PARTNER
        )
      ).toEqual({ activeRole: SystemRole.INDUSTRY_PARTNER, path });
    }
  );

  it("does not select a requested role the verified account does not hold", async () => {
    const account = externalAccount();
    findUserMock.mockResolvedValue({ ...account, roles: [{ role: SystemRole.ALUMNI }] });

    expect(
      await resolveExternalPostVerificationDestination(
        "verified-identity",
        SystemRole.INDUSTRY_PARTNER
      )
    ).toEqual({ activeRole: SystemRole.ALUMNI, path: "/alumni/dashboard" });
  });
});
