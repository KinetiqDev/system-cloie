/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@prisma/client";
import { linkExternalVerifiedIdentity } from "@/features/users/services/link-external-identity";

const {
  findUniqueUserMock,
  updateManyUserMock,
  createUserMock,
  createUserRoleMock,
  transactionMock,
} = vi.hoisted(() => ({
  findUniqueUserMock: vi.fn(),
  updateManyUserMock: vi.fn(),
  createUserMock: vi.fn(),
  createUserRoleMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { $transaction: transactionMock },
}));

function mockUser(user: Record<string, unknown> | null) {
  findUniqueUserMock.mockReset();
  findUniqueUserMock
    .mockResolvedValueOnce(null) // by auth_user_id
    .mockResolvedValueOnce(user); // by email
}

describe("linkExternalVerifiedIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        user: {
          findUnique: findUniqueUserMock,
          updateMany: updateManyUserMock,
          create: createUserMock,
        },
        userRole: { create: createUserRoleMock },
      })
    );
  });

  it.each(["STUDENT", "FACULTY", "SECRETARY", "DEAN", "PROGRAM_HEAD", "GEN_ED_COORDINATOR"])(
    "never claims a Secretary-provisioned %s account for a password-verified identity",
    async (role) => {
      mockUser({
        id: "internal-user-1",
        email: "person@acd.edu.ph",
        name: "Provisional Name",
        auth_user_id: null,
        roles: [{ role }],
      });

      const result = await linkExternalVerifiedIdentity({
        authUserId: "auth-password-1",
        email: "person@acd.edu.ph",
        name: "Attacker Name",
        role: SystemRole.ALUMNI,
      });

      // Linking here would bind the wrong identity and permanently deny the
      // account its own Google sign-in as an identity conflict.
      expect(result).toEqual({ linked: false, existingUserId: "internal-user-1" });
      expect(updateManyUserMock).not.toHaveBeenCalled();
      expect(createUserMock).not.toHaveBeenCalled();
      expect(createUserRoleMock).not.toHaveBeenCalled();
    }
  );

  it("claims an unlinked external-eligible account and stores the collected name", async () => {
    mockUser({
      id: "external-user-1",
      email: "alum@example.com",
      name: "Provisional",
      auth_user_id: null,
      roles: [{ role: "ALUMNI" }],
    });
    updateManyUserMock.mockResolvedValue({ count: 1 });

    const result = await linkExternalVerifiedIdentity({
      authUserId: "auth-password-2",
      email: "alum@example.com",
      name: "Amara Reyes",
      role: SystemRole.ALUMNI,
    });

    expect(result).toEqual({ linked: true, existingUserId: "external-user-1" });
    expect(updateManyUserMock).toHaveBeenCalledWith({
      where: { id: "external-user-1", auth_user_id: null },
      data: { auth_user_id: "auth-password-2", name: "Amara Reyes" },
    });
    // The account already held the role, so no duplicate grant is written.
    expect(createUserRoleMock).not.toHaveBeenCalled();
  });

  it("grants the registered role when claiming a roleless external account", async () => {
    mockUser({
      id: "external-user-2",
      email: "partner@example.com",
      name: "Provisional",
      auth_user_id: null,
      roles: [],
    });
    updateManyUserMock.mockResolvedValue({ count: 1 });
    createUserRoleMock.mockResolvedValue({ id: "role-row-1" });

    const result = await linkExternalVerifiedIdentity({
      authUserId: "auth-password-6",
      email: "partner@example.com",
      name: "Bela Santos",
      role: SystemRole.INDUSTRY_PARTNER,
    });

    expect(result).toEqual({ linked: true, existingUserId: "external-user-2" });
    expect(createUserRoleMock).toHaveBeenCalledWith({
      data: { user_id: "external-user-2", role: SystemRole.INDUSTRY_PARTNER },
    });
  });

  it("creates the account together with the registered role", async () => {
    mockUser(null);
    createUserMock.mockResolvedValue({ id: "new-user-1" });

    const result = await linkExternalVerifiedIdentity({
      authUserId: "auth-password-3",
      email: "new@example.com",
      name: "New Person",
      role: SystemRole.ALUMNI,
    });

    expect(result).toEqual({ linked: true, existingUserId: "new-user-1" });
    expect(createUserMock).toHaveBeenCalledWith({
      data: {
        auth_user_id: "auth-password-3",
        email: "new@example.com",
        name: "New Person",
        roles: { create: { role: SystemRole.ALUMNI } },
      },
      select: { id: true },
    });
  });

  it("refuses to create a role-less account when no external role was recorded", async () => {
    mockUser(null);

    const result = await linkExternalVerifiedIdentity({
      authUserId: "auth-password-7",
      email: "unknown@example.com",
      name: "Unknown Person",
      role: null,
    });

    expect(result).toEqual({ linked: false, existingUserId: null });
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("leaves an unlinked roleless account unclaimed when no external role is recorded", async () => {
    mockUser({
      id: "roleless-user",
      email: "unknown@example.com",
      name: "Existing Person",
      auth_user_id: null,
      roles: [],
    });
    updateManyUserMock.mockResolvedValue({ count: 1 });

    const result = await linkExternalVerifiedIdentity({
      authUserId: "auth-without-role",
      email: "unknown@example.com",
      name: "Existing Person",
      role: null,
    });

    expect(result).toEqual({ linked: false, existingUserId: "roleless-user" });
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(createUserRoleMock).not.toHaveBeenCalled();
  });

  it.each(["STUDENT", "SECRETARY", "FACULTY"])(
    "refuses to create an account with the non-external role %s even when a caller passes one",
    async (role) => {
      mockUser(null);

      const result = await linkExternalVerifiedIdentity({
        authUserId: "auth-password-8",
        email: "escalate@example.com",
        name: "Escalation Attempt",
        role: role as SystemRole,
      });

      expect(result).toEqual({ linked: false, existingUserId: null });
      expect(createUserMock).not.toHaveBeenCalled();
      expect(createUserRoleMock).not.toHaveBeenCalled();
    }
  );

  it("never overwrites an account already linked to another identity", async () => {
    mockUser({
      id: "external-user-1",
      email: "alum@example.com",
      name: "Existing",
      auth_user_id: "auth-google-1",
      roles: [{ role: "INDUSTRY_PARTNER" }],
    });

    const result = await linkExternalVerifiedIdentity({
      authUserId: "auth-password-4",
      email: "alum@example.com",
      name: "Someone Else",
      role: SystemRole.ALUMNI,
    });

    expect(result).toEqual({ linked: false, existingUserId: "external-user-1" });
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(createUserRoleMock).not.toHaveBeenCalled();
  });

  it("returns the existing account without touching it when the identity is already linked", async () => {
    findUniqueUserMock.mockReset().mockResolvedValueOnce({ id: "already-linked" });

    const result = await linkExternalVerifiedIdentity({
      authUserId: "auth-password-5",
      email: "any@example.com",
      name: "Any",
      role: SystemRole.ALUMNI,
    });

    expect(result).toEqual({ linked: true, existingUserId: "already-linked" });
    expect(updateManyUserMock).not.toHaveBeenCalled();
    expect(createUserMock).not.toHaveBeenCalled();
  });
});
