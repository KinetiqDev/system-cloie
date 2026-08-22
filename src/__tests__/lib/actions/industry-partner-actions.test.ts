/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createIndustryPartnerProfile } from "@/lib/actions/industry-partner-actions";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";

const { resolveAuthenticatedDomainUserMock } = vi.hoisted(() => ({
  resolveAuthenticatedDomainUserMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      update: vi.fn(),
    },
    industryPartnerProfile: {
      upsert: vi.fn(),
    },
    industryPartnerProgramAffiliation: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    userRole: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    program: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-authenticated-domain-user", () => ({
  resolveAuthenticatedDomainUser: resolveAuthenticatedDomainUserMock,
}));

const validPayload = {
  company_name: "Test Corp",
  position: "Manager",
  program_id: "550e8400-e29b-41d4-a716-446655440000",
};

describe("Industry Partner Actions", () => {
  const mockGetUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: mockGetUser,
      },
    });

    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      return callback(prisma);
    });

    resolveAuthenticatedDomainUserMock.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Jane Doe",
      auth_user_id: "auth-user-123",
      is_active: true,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });
    (prisma.program.findMany as any).mockImplementation(async (args: any) => {
      const ids: string[] = args?.where?.id?.in ?? [];
      if (ids.length === 0) return [];
      return ids.map((id) => ({ id, is_active: true }));
    });
  });

  it("should fail if user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No user" } });

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Authentication session invalid or missing.");
  });

  it("should fail validation for invalid data", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });

    const result = await createIndustryPartnerProfile({
      company_name: "A",
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("should fail validation when position or affiliated program is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });

    const result = await createIndustryPartnerProfile({
      company_name: "Test Corp",
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("should create profile and role successfully with minimal data", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-user-123",
          email: "test@example.com",
        },
      },
      error: null,
    });

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.industryPartnerProfile.upsert).toHaveBeenCalledWith({
      where: { user_id: "user-123" },
      update: {
        company_name: "Test Corp",
        position: "Manager",
        program_id: "550e8400-e29b-41d4-a716-446655440000",
      },
      create: {
        user_id: "user-123",
        company_name: "Test Corp",
        position: "Manager",
        program_id: "550e8400-e29b-41d4-a716-446655440000",
      },
    });
    expect(prisma.userRole.findUnique).toHaveBeenCalledWith({
      where: { user_id: "user-123" },
    });
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-123",
        role: ROLES.INDUSTRY_PARTNER,
      },
    });
  });

  it("preserves stored name when client identity is injected", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-user-123",
          email: "test@example.com",
        },
      },
      error: null,
    });

    const result = await createIndustryPartnerProfile({
      ...validPayload,
      first_name: "Hacker",
      last_name: "Name",
      name: "Hacker Name",
    } as any);

    expect(result.success).toBe(true);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("should create profile and role successfully with all data", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-user-123",
          email: "test@example.com",
        },
      },
      error: null,
    });

    const result = await createIndustryPartnerProfile({
      company_name: "Test Corp",
      position: "Manager",
      program_id: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.industryPartnerProfile.upsert).toHaveBeenCalledWith({
      where: { user_id: "user-123" },
      update: {
        company_name: "Test Corp",
        position: "Manager",
        program_id: "550e8400-e29b-41d4-a716-446655440000",
      },
      create: {
        user_id: "user-123",
        company_name: "Test Corp",
        position: "Manager",
        program_id: "550e8400-e29b-41d4-a716-446655440000",
      },
    });
  });

  it("should return correct error when duplicate role exists", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });

    (prisma.$transaction as any).mockRejectedValue(createPrismaUniqueConstraintError());

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("An unexpected error occurred while processing your request.");
  });

  it("should fail if the program does not exist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });
    (prisma.program.findMany as any).mockResolvedValue([]);

    const result = await createIndustryPartnerProfile({
      company_name: "Test Corp",
      position: "Manager",
      program_id: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("The selected program does not exist.");
  });

  it("should fail if the program is archived or inactive", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });
    (prisma.program.findMany as any).mockResolvedValue([
      { id: "550e8400-e29b-41d4-a716-446655440000", is_active: false },
    ]);

    const result = await createIndustryPartnerProfile({
      company_name: "Test Corp",
      position: "Manager",
      program_id: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("The selected program is archived or inactive.");
  });

  it("should check if userRole exists before creating and skip creating if it exists", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-user-123",
          email: "test@example.com",
        },
      },
      error: null,
    });
    (prisma.userRole.findUnique as any).mockResolvedValue({
      id: "role-123",
      user_id: "user-123",
      role: ROLES.INDUSTRY_PARTNER,
    });

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(true);
    expect(prisma.userRole.findUnique).toHaveBeenCalledWith({
      where: { user_id: "user-123" },
    });
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });

  it("should log the error and return a generic fallback string when transaction fails with a non-P2002 error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const customError = new Error("Database connection timeout");
    (prisma.$transaction as any).mockRejectedValue(customError);

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("An unexpected error occurred while processing your request.");
    expect(consoleSpy).toHaveBeenCalledWith("Failed to create industry partner profile:", customError);
    consoleSpy.mockRestore();
  });

  it("should fail onboarding if userRole exists and is a different role", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-user-123",
          email: "test@example.com",
        },
      },
      error: null,
    });
    (prisma.userRole.findUnique as any).mockResolvedValue({
      id: "role-123",
      user_id: "user-123",
      role: ROLES.STUDENT,
    });

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Your account is already registered with a different role.");
  });

  it("rejects registration when the resolved domain user is inactive", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });
    resolveAuthenticatedDomainUserMock.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Jane Doe",
      auth_user_id: "auth-user-123",
      is_active: false,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Your CLOIE account is currently inactive.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects registration when industry partner verification status is REJECTED", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });
    resolveAuthenticatedDomainUserMock.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Jane Doe",
      auth_user_id: "auth-user-123",
      is_active: true,
      alumni_profile: null,
      industry_partner_profile: { verification_status: "REJECTED" },
    });

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Your registration application was not approved.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
