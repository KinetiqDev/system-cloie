import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueUserMock } = vi.hoisted(() => ({
  findUniqueUserMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueUserMock,
    },
  },
}));

import { resolveAuthenticatedDomainUser } from "@/features/auth/services/resolve-authenticated-domain-user";

const domainUserSelect = {
  id: true,
  email: true,
  name: true,
  auth_user_id: true,
  is_active: true,
  alumni_profile: {
    select: { verification_status: true },
  },
  industry_partner_profile: {
    select: { verification_status: true },
  },
};

describe("resolveAuthenticatedDomainUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the domain user matched by auth_user_id", async () => {
    findUniqueUserMock.mockResolvedValueOnce({
      id: "domain-1",
      email: "student@acd.edu.ph",
      name: "Jane Doe",
      auth_user_id: "auth-1",
      is_active: true,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    const result = await resolveAuthenticatedDomainUser({
      authUserId: "auth-1",
      email: "student@acd.edu.ph",
    });

    expect(result).toEqual({
      id: "domain-1",
      email: "student@acd.edu.ph",
      name: "Jane Doe",
      auth_user_id: "auth-1",
      is_active: true,
      alumni_profile: null,
      industry_partner_profile: null,
    });
    expect(findUniqueUserMock).toHaveBeenCalledTimes(1);
    expect(findUniqueUserMock).toHaveBeenCalledWith({
      where: { auth_user_id: "auth-1" },
      select: domainUserSelect,
    });
  });

  it("falls back to normalized email only when the match is unlinked", async () => {
    findUniqueUserMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "domain-2",
        email: "student@acd.edu.ph",
        name: "Jane Doe",
        auth_user_id: null,
        is_active: true,
        alumni_profile: null,
        industry_partner_profile: null,
      });

    const result = await resolveAuthenticatedDomainUser({
      authUserId: "auth-2",
      email: "  Student@ACD.edu.ph ",
    });

    expect(result?.id).toBe("domain-2");
    expect(result?.auth_user_id).toBeNull();
    expect(findUniqueUserMock).toHaveBeenNthCalledWith(2, {
      where: { email: "student@acd.edu.ph" },
      select: domainUserSelect,
    });
  });

  it("returns null when normalized email matches a User linked to a different auth_user_id", async () => {
    findUniqueUserMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "domain-conflict",
        email: "student@acd.edu.ph",
        name: "Jane Doe",
        auth_user_id: "other-auth-id",
        is_active: true,
        alumni_profile: null,
        industry_partner_profile: null,
      });

    const result = await resolveAuthenticatedDomainUser({
      authUserId: "auth-caller",
      email: "student@acd.edu.ph",
    });

    expect(result).toBeNull();
    expect(findUniqueUserMock).toHaveBeenCalledTimes(2);
    expect(findUniqueUserMock).toHaveBeenNthCalledWith(2, {
      where: { email: "student@acd.edu.ph" },
      select: domainUserSelect,
    });
  });

  it("returns null when neither auth_user_id nor email match", async () => {
    findUniqueUserMock.mockResolvedValue(null);

    const result = await resolveAuthenticatedDomainUser({
      authUserId: "auth-missing",
      email: "missing@acd.edu.ph",
    });

    expect(result).toBeNull();
  });
});
