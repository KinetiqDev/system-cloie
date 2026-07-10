import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { editUserBySecretary } from "@/features/users/services/edit-user-by-secretary";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));

describe("editUserBySecretary service", () => {
  const validInput = {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    first_name: "Jane",
    last_name: "Smith",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "123e4567-e89b-12d3-a456-426614174000",
      activeRole: ROLES.SECRETARY,
      roles: [ROLES.SECRETARY],
    });

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      is_active: true,
    });
  });

  it("updates base identity for a valid request", async () => {
    const result = await editUserBySecretary(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    }

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },
      data: {
        first_name: "Jane",
        last_name: "Smith",
      },
    });
  });

  it("allows updating an inactive account", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "target-user-id",
      is_active: false,
    });

    const result = await editUserBySecretary(validInput);

    expect(result.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("rejects when the user is not authenticated", async () => {
    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await editUserBySecretary(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/authentication required/i);
    }
  });

  it("rejects when the user is not a Secretary", async () => {
    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "dean-id",
      activeRole: ROLES.DEAN,
      roles: [ROLES.DEAN],
    });

    const result = await editUserBySecretary(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/secretary access required/i);
    }
  });

  it("rejects when a Secretary tries to edit their own account", async () => {
    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", // Matches target
      activeRole: ROLES.SECRETARY,
      roles: [ROLES.SECRETARY],
    });

    const result = await editUserBySecretary(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/cannot edit your own account/i);
    }
  });

  it("rejects when the target user does not exist", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await editUserBySecretary(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/user not found/i);
    }
  });

  it("rejects invalid input (missing first name)", async () => {
    const result = await editUserBySecretary({
      ...validInput,
      first_name: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/first name is required/i);
    }
  });

  it("rejects invalid input (missing last name)", async () => {
    const result = await editUserBySecretary({
      ...validInput,
      last_name: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/last name is required/i);
    }
  });
});
