/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveProfileGate } from "@/features/users/services/resolve-profile-gate";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { facultyProfileSchema } from "@/lib/schemas/faculty-profile";
import { createFacultyProfile } from "@/lib/actions/faculty-actions";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";

const { resolveAuthSessionMock } = vi.hoisted(() => ({ resolveAuthSessionMock: vi.fn() }));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

const {
  resolveAuthenticatedDomainUserMock,
  facultyAccessRequestFindUniqueMock,
  facultyAffiliationFindFirstMock,
} = vi.hoisted(() => ({
  resolveAuthenticatedDomainUserMock: vi.fn(),
  facultyAccessRequestFindUniqueMock: vi.fn(),
  facultyAffiliationFindFirstMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    facultyAccessRequest: {
      findUnique: facultyAccessRequestFindUniqueMock,
      upsert: vi.fn(async () => ({ status: "PENDING" })),
    },
    $transaction: vi.fn(),
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    userRole: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    facultyProgramAffiliation: {
      upsert: vi.fn(),
      findFirst: facultyAffiliationFindFirstMock,
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
  const mockGetClaims = vi.fn();
  const validPayload = {
    program_id: "550e8400-e29b-41d4-a716-446655440000",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: mockGetUser,
        getClaims: mockGetClaims,
      },
    });

    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      return callback(prisma);
    });

    resolveAuthenticatedDomainUserMock.mockResolvedValue({
      id: "faculty-123",
      email: "teacher@acd.edu.ph",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: true,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    (prisma.userRole.findUnique as any).mockResolvedValue(null);
    // No self-request row: a Secretary-provisioned Faculty account is active
    // at creation, so createFacultyProfile may still write its affiliation.
    facultyAccessRequestFindUniqueMock.mockResolvedValue(null);
    facultyAffiliationFindFirstMock.mockResolvedValue({ id: "affiliation-1" });
    // A proved Google session on an ACD address, bound to this account.
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "teacher@acd.edu.ph",
      authMethod: "google",
      activeRole: "FACULTY",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "faculty-123",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: true,
    });
  });

  it("should fail if user is not authenticated", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Authentication session invalid or missing.");
  });

  it("should fail if the program does not exist", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "teacher@acd.edu.ph",
      authMethod: "google",
      activeRole: "FACULTY",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "faculty-123",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: true,
    });
    (prisma.program.findUnique as any).mockResolvedValue(null);

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("The selected program does not exist.");
  });

  it("should fail if the program is archived or inactive", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "teacher@acd.edu.ph",
      authMethod: "google",
      activeRole: "FACULTY",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "faculty-123",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: true,
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
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "teacher@acd.edu.ph",
      authMethod: "google",
      activeRole: "FACULTY",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "faculty-123",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: true,
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
      where: { user_id_role: { user_id: "faculty-123", role: ROLES.FACULTY } },
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
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "teacher@acd.edu.ph",
      authMethod: "google",
      activeRole: "FACULTY",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "faculty-123",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: true,
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
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "teacher@acd.edu.ph",
      authMethod: "google",
      activeRole: "FACULTY",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "faculty-123",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: true,
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
      where: { user_id_role: { user_id: "faculty-123", role: ROLES.FACULTY } },
    });
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });

  it("should return client-safe unexpected error message if database transaction fails", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "teacher@acd.edu.ph",
      authMethod: "google",
      activeRole: "FACULTY",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "faculty-123",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: true,
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

  it("allows onboarding when the user holds a different role (multi-role)", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "teacher@acd.edu.ph",
      authMethod: "google",
      activeRole: "FACULTY",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "faculty-123",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: true,
    });
    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });
    // No FACULTY role claimed yet; other roles no longer block registration.
    (prisma.userRole.findUnique as any).mockResolvedValue(null);
    // No self-request row: a Secretary-provisioned Faculty account is active
    // at creation, so createFacultyProfile may still write its affiliation.
    facultyAccessRequestFindUniqueMock.mockResolvedValue(null);
    facultyAffiliationFindFirstMock.mockResolvedValue({ id: "affiliation-1" });

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(true);
    expect(prisma.userRole.findUnique).toHaveBeenCalledWith({
      where: { user_id_role: { user_id: "faculty-123", role: ROLES.FACULTY } },
    });
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: {
        user_id: "faculty-123",
        role: ROLES.FACULTY,
      },
    });
  });

  it("rejects registration when the resolved domain user is inactive", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "teacher@acd.edu.ph",
      authMethod: "google",
      activeRole: "FACULTY",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "faculty-123",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: true,
    });
    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "faculty-123",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: false,
    });

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Your CLOIE account is currently inactive.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses when the session resolves no account at all", async () => {
    // An unlinked account cannot produce a session: the boundary resolves the
    // User from the verified link, so a missing row means no account owns this
    // session and nothing may be written.
    resolveAuthSessionMock.mockResolvedValue(null);

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Authentication session invalid or missing.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses a session whose account record is gone", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "teacher@acd.edu.ph",
      authMethod: "google",
      activeRole: "FACULTY",
    });
    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toContain("could not be resolved");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("files a review request instead of granting access to a self-service claimant", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "teacher@acd.edu.ph",
      authMethod: "google",
      activeRole: "FACULTY",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "faculty-123",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: true,
    });
    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });
    facultyAccessRequestFindUniqueMock.mockResolvedValue(null);
    facultyAffiliationFindFirstMock.mockResolvedValue(null);
    (prisma.userRole.findUnique as any).mockResolvedValue(null);

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toContain("institutional review");
    expect(prisma.facultyProgramAffiliation.upsert).not.toHaveBeenCalled();
  });

  it.each(["password", "otp", "recovery"] as const)(
    "refuses a %s session from mutating Faculty scope",
    async (method) => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "auth-faculty-123", email: "teacher@acd.edu.ph" } },
        error: null,
      });
      (prisma.program.findUnique as any).mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440000",
        is_active: true,
      });
      // A linked, fully eligible account — the only thing that may stop this
      // write is the session method itself.
      facultyAccessRequestFindUniqueMock.mockResolvedValue(null);
      facultyAffiliationFindFirstMock.mockResolvedValue({ id: "affiliation-1" });
      resolveAuthSessionMock.mockResolvedValue({
        userId: "faculty-123",
        email: "teacher@acd.edu.ph",
        authMethod: method,
        activeRole: "FACULTY",
      });
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "faculty-123",
        name: "Jane Smith",
        auth_user_id: "faculty-123",
        is_active: true,
      });

      const result = await createFacultyProfile(validPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain("current ACD Google sign-in");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    }
  );

  it("refuses an oauth session from a non-Google provider", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "teacher@acd.edu.ph",
      authMethod: "google",
      activeRole: "FACULTY",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "faculty-123",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: true,
    });
    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });
    facultyAccessRequestFindUniqueMock.mockResolvedValue(null);
    facultyAffiliationFindFirstMock.mockResolvedValue({ id: "affiliation-1" });
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "teacher@acd.edu.ph",
      authMethod: null,
      activeRole: "FACULTY",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "faculty-123",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: true,
    });

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses a non-institutional email even from a Google session", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "person@gmail.com",
      authMethod: "google",
      activeRole: "FACULTY",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "faculty-123",
      name: "Jane Smith",
      auth_user_id: "faculty-123",
      is_active: true,
    });
    (prisma.program.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toContain("institutional");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
