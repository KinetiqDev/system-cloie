/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { linkExternalVerifiedIdentity } from "@/features/users/services/link-external-identity";
import { prisma } from "@/lib/db/prisma";

const { findUniqueUserMock, updateManyUserMock, createUserMock, transactionMock } = vi.hoisted(
  () => ({
    findUniqueUserMock: vi.fn(),
    updateManyUserMock: vi.fn(),
    createUserMock: vi.fn(),
    transactionMock: vi.fn(),
  })
);

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
      });

      // Linking here would bind the wrong identity and permanently deny the
      // account its own Google sign-in as an identity conflict.
      expect(result).toEqual({ linked: false, existingUserId: "internal-user-1" });
      expect(updateManyUserMock).not.toHaveBeenCalled();
      expect(createUserMock).not.toHaveBeenCalled();
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
    });

    expect(result).toEqual({ linked: true, existingUserId: "external-user-1" });
    expect(updateManyUserMock).toHaveBeenCalledWith({
      where: { id: "external-user-1", auth_user_id: null },
      data: { auth_user_id: "auth-password-2", name: "Amara Reyes" },
    });
  });

  it("creates the account when the verified address is unknown", async () => {
    mockUser(null);
    createUserMock.mockResolvedValue({ id: "new-user-1" });

    const result = await linkExternalVerifiedIdentity({
      authUserId: "auth-password-3",
      email: "new@example.com",
      name: "New Person",
    });

    expect(result).toEqual({ linked: true, existingUserId: "new-user-1" });
    expect(createUserMock).toHaveBeenCalledWith({
      data: { auth_user_id: "auth-password-3", email: "new@example.com", name: "New Person" },
      select: { id: true },
    });
  });

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
    });

    expect(result).toEqual({ linked: false, existingUserId: "external-user-1" });
    expect(updateManyUserMock).not.toHaveBeenCalled();
  });

  it("returns the existing account without touching it when the identity is already linked", async () => {
    findUniqueUserMock.mockReset().mockResolvedValueOnce({ id: "already-linked" });

    const result = await linkExternalVerifiedIdentity({
      authUserId: "auth-password-5",
      email: "any@example.com",
      name: "Any",
    });

    expect(result).toEqual({ linked: true, existingUserId: "already-linked" });
    expect(updateManyUserMock).not.toHaveBeenCalled();
  });
});
