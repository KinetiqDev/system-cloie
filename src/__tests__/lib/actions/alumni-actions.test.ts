/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAlumniProfile } from "@/lib/actions/alumni-actions";
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
    alumniProfile: {
      upsert: vi.fn(),
    },
    userRole: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    program: {
      findUnique: vi.fn(),
    },
    major: {
      findUnique: vi.fn(),
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
  graduation_year: 2020,
  program_id: "550e8400-e29b-41d4-a716-446655440000",
};

describe("Alumni Actions", () => {
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
      name: "John Doe",
      auth_user_id: "auth-user-123",
      is_active: true,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });

    (prisma.major.findUnique as any).mockResolvedValue({
      id: "660e8400-e29b-41d4-a716-446655441111",
      program_id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });
  });

  it("should fail if user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No user" } });

    const result = await createAlumniProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Authentication session invalid or missing.");
  });

  it("should fail validation for invalid data", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });

    const result = await createAlumniProfile({
      graduation_year: 1900,
      program_id: "not-a-uuid",
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("should create profile and role successfully without major", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-user-123",
          email: "test@example.com",
        },
      },
      error: null,
    });

    const result = await createAlumniProfile(validPayload);

    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.alumniProfile.upsert).toHaveBeenCalledWith({
      where: { user_id: "user-123" },
      update: {
        graduation_year: 2020,
        program_id: "550e8400-e29b-41d4-a716-446655440000",
        major_id: null,
      },
      create: {
        user_id: "user-123",
        graduation_year: 2020,
        program_id: "550e8400-e29b-41d4-a716-446655440000",
        major_id: null,
      },
    });
    expect(prisma.userRole.findUnique).toHaveBeenCalledWith({
      where: { user_id: "user-123" },
    });
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-123",
        role: ROLES.ALUMNI,
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

    const result = await createAlumniProfile({
      ...validPayload,
      first_name: "Hacker",
      last_name: "Name",
      name: "Hacker Name",
    } as any);

    expect(result.success).toBe(true);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("should create profile and role successfully with major", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-user-123",
          email: "test@example.com",
        },
      },
      error: null,
    });

    const result = await createAlumniProfile({
      ...validPayload,
      major_id: "660e8400-e29b-41d4-a716-446655441111",
    });

    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.alumniProfile.upsert).toHaveBeenCalledWith({
      where: { user_id: "user-123" },
      update: {
        graduation_year: 2020,
        program_id: "550e8400-e29b-41d4-a716-446655440000",
        major_id: "660e8400-e29b-41d4-a716-446655441111",
      },
      create: {
        user_id: "user-123",
        graduation_year: 2020,
        program_id: "550e8400-e29b-41d4-a716-446655440000",
        major_id: "660e8400-e29b-41d4-a716-446655441111",
      },
    });
  });

  it("should return correct error when duplicate role exists", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });

    (prisma.$transaction as any).mockRejectedValue(createPrismaUniqueConstraintError());

    const result = await createAlumniProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("You already have an alumni profile.");
  });

  it("should fail if the program does not exist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });
    (prisma.program.findUnique as any).mockResolvedValue(null);

    const result = await createAlumniProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("The selected program does not exist.");
  });

  it("should fail if the program is archived or inactive", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });
    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: false,
    });

    const result = await createAlumniProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("The selected program is archived or inactive.");
  });

  it("should fail if the major does not exist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });
    (prisma.major.findUnique as any).mockResolvedValue(null);

    const result = await createAlumniProfile({
      ...validPayload,
      major_id: "660e8400-e29b-41d4-a716-446655441111",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("The selected major does not exist.");
  });

  it("should fail if the major is inactive", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });
    (prisma.major.findUnique as any).mockResolvedValue({
      id: "660e8400-e29b-41d4-a716-446655441111",
      program_id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: false,
    });

    const result = await createAlumniProfile({
      ...validPayload,
      major_id: "660e8400-e29b-41d4-a716-446655441111",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("The selected major is archived or inactive.");
  });

  it("should fail if the major belongs to a different program", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });
    (prisma.major.findUnique as any).mockResolvedValue({
      id: "660e8400-e29b-41d4-a716-446655441111",
      program_id: "different-program-id",
      is_active: true,
    });

    const result = await createAlumniProfile({
      ...validPayload,
      major_id: "660e8400-e29b-41d4-a716-446655441111",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("The selected major does not belong to the selected program.");
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
      role: ROLES.ALUMNI,
    });

    const result = await createAlumniProfile(validPayload);

    expect(result.success).toBe(true);
    expect(prisma.userRole.findUnique).toHaveBeenCalledWith({
      where: { user_id: "user-123" },
    });
    expect(prisma.userRole.create).not.toHaveBeenCalled();
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

    const result = await createAlumniProfile(validPayload);

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
      name: "John Doe",
      auth_user_id: "auth-user-123",
      is_active: false,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    const result = await createAlumniProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Your CLOIE account is currently inactive.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects registration when alumni verification status is REJECTED", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-123", email: "test@example.com" } },
      error: null,
    });
    resolveAuthenticatedDomainUserMock.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "John Doe",
      auth_user_id: "auth-user-123",
      is_active: true,
      alumni_profile: { verification_status: "REJECTED" },
      industry_partner_profile: null,
    });

    const result = await createAlumniProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Your registration application was not approved.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
