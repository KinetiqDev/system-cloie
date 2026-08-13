/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveProfileGate } from "@/features/users/services/resolve-profile-gate";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { facultyProfileSchema } from "@/lib/schemas/faculty-profile";
import { createFacultyProfile } from "@/lib/actions/faculty-actions";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";

const { resolveAuthenticatedDomainUserMock } = vi.hoisted(() => ({
  resolveAuthenticatedDomainUserMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      update: vi.fn(),
    },
    userRole: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    facultyProgramAffiliation: {
      upsert: vi.fn(),
    },
    program: {
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

describe("resolveProfileGate — Faculty", () => {
  it("returns FACULTY_ONBOARDING_REQUIRED when user has FACULTY role but hasFacultyAffiliation is false", () => {
    const result = resolveProfileGate({
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      hasFacultyAffiliation: false,
    });
    expect(result).toEqual({ status: "FACULTY_ONBOARDING_REQUIRED", intent: "faculty" });
  });

  it("returns COMPLETE when user has FACULTY role and hasFacultyAffiliation is true", () => {
    const result = resolveProfileGate({
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      hasFacultyAffiliation: true,
    });
    expect(result).toEqual({ status: "COMPLETE" });
  });
});

describe("resolvePostLoginDestination — Faculty", () => {
  it("routes FACULTY_ONBOARDING_REQUIRED to /onboarding?intent=faculty", () => {
    const destination = resolvePostLoginDestination({
      requestedPath: "/portal/respondents",
      intent: null,
      activeRole: ROLES.FACULTY,
      profileGate: { status: "FACULTY_ONBOARDING_REQUIRED", intent: "faculty" },
    });
    expect(destination).toBe("/onboarding?intent=faculty");
  });
});

describe("facultyProfileSchema", () => {
  const validData = {
    program_id: "550e8400-e29b-41d4-a716-446655440000",
  };

  it("parses successfully with valid inputs", () => {
    const result = facultyProfileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("strips injected identity fields from successful parse output", () => {
    const result = facultyProfileSchema.safeParse({
      ...validData,
      first_name: "Injected",
      last_name: "Identity",
      name: "Injected Identity",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
      expect(result.data).not.toHaveProperty("first_name");
      expect(result.data).not.toHaveProperty("last_name");
      expect(result.data).not.toHaveProperty("name");
    }
  });

  it("fails when program_id is not a valid UUID", () => {
    const result = facultyProfileSchema.safeParse({ ...validData, program_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("createFacultyProfile Server Action", () => {
  const mockGetUser = vi.fn();
  const validPayload = {
    program_id: "550e8400-e29b-41d4-a716-446655440000",
  };

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
      id: "faculty-123",
      email: "teacher@acd.edu.ph",
      name: "Jane Smith",
      auth_user_id: "auth-faculty-123",
      is_active: true,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    (prisma.userRole.findUnique as any).mockResolvedValue(null);
  });

  it("should fail if user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No user" } });

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Authentication session invalid or missing.");
  });

  it("should fail if the program does not exist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-faculty-123", email: "teacher@acd.edu.ph" } },
      error: null,
    });
    (prisma.program.findUnique as any).mockResolvedValue(null);

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("The selected program does not exist.");
  });

  it("should fail if the program is archived or inactive", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-faculty-123", email: "teacher@acd.edu.ph" } },
      error: null,
    });
    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: false,
    });

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("The selected program is archived or inactive.");
  });

  it("should create profile, role, and program affiliation successfully", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-faculty-123", email: "teacher@acd.edu.ph" } },
      error: null,
    });
    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.userRole.findUnique).toHaveBeenCalledWith({
      where: { user_id: "faculty-123" },
    });
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: {
        user_id: "faculty-123",
        role: ROLES.FACULTY,
      },
    });
    expect(prisma.facultyProgramAffiliation.upsert).toHaveBeenCalledWith({
      where: {
        faculty_id_program_id: {
          faculty_id: "faculty-123",
          program_id: "550e8400-e29b-41d4-a716-446655440000",
        },
      },
      update: {
        is_primary: true,
        is_active: true,
      },
      create: {
        faculty_id: "faculty-123",
        program_id: "550e8400-e29b-41d4-a716-446655440000",
        is_primary: true,
        is_active: true,
      },
    });
  });

  it("preserves stored name when client identity is injected", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-faculty-123", email: "teacher@acd.edu.ph" } },
      error: null,
    });
    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });

    const result = await createFacultyProfile({
      ...validPayload,
      first_name: "Hacker",
      last_name: "Name",
      name: "Hacker Name",
    } as any);

    expect(result.success).toBe(true);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("should check if userRole exists before creating and skip creating if it exists", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-faculty-123", email: "teacher@acd.edu.ph" } },
      error: null,
    });
    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });
    (prisma.userRole.findUnique as any).mockResolvedValue({
      id: "role-123",
      user_id: "faculty-123",
      role: ROLES.FACULTY,
    });

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(true);
    expect(prisma.userRole.findUnique).toHaveBeenCalledWith({
      where: { user_id: "faculty-123" },
    });
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });

  it("should return client-safe unexpected error message if database transaction fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-faculty-123", email: "teacher@acd.edu.ph" } },
      error: null,
    });
    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });
    (prisma.$transaction as any).mockRejectedValue(new Error("Database connection error"));

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("An unexpected error occurred while processing your request.");
  });

  it("should fail onboarding if userRole exists and is a different role", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-faculty-123", email: "teacher@acd.edu.ph" } },
      error: null,
    });
    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });
    (prisma.userRole.findUnique as any).mockResolvedValue({
      id: "role-123",
      user_id: "faculty-123",
      role: ROLES.STUDENT,
    });

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Your account is already registered with a different role.");
  });

  it("rejects registration when the resolved domain user is inactive", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-faculty-123", email: "teacher@acd.edu.ph" } },
      error: null,
    });
    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });
    resolveAuthenticatedDomainUserMock.mockResolvedValue({
      id: "faculty-123",
      email: "teacher@acd.edu.ph",
      name: "Jane Smith",
      auth_user_id: "auth-faculty-123",
      is_active: false,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Your CLOIE account is currently inactive.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
