/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetIncompleteRoleClaim, registerStudentProfile } from "@/lib/actions/onboarding-actions";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";

const REDIRECT_ERROR = "NEXT_REDIRECT";

const {
  redirectMock,
  resolveAuthSessionMock,
  resolveAuthenticatedDomainUserMock,
  deleteManyUserRoleMock,
  updateUserMock,
  upsertStudentProfileMock,
  findUniqueUserRoleMock,
  createUserRoleMock,
  findUniqueProgramMock,
  findUniqueMajorMock,
  transactionMock,
  createClientMock,
  getActiveTermIdMock,
  upsertEnrollmentForActiveTermMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`${REDIRECT_ERROR}:${path}`);
  }),
  resolveAuthSessionMock: vi.fn(),
  resolveAuthenticatedDomainUserMock: vi.fn(),
  deleteManyUserRoleMock: vi.fn(),
  updateUserMock: vi.fn(),
  upsertStudentProfileMock: vi.fn(),
  findUniqueUserRoleMock: vi.fn(),
  createUserRoleMock: vi.fn(),
  findUniqueProgramMock: vi.fn(),
  findUniqueMajorMock: vi.fn(),
  transactionMock: vi.fn(),
  createClientMock: vi.fn(),
  getActiveTermIdMock: vi.fn(),
  upsertEnrollmentForActiveTermMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-authenticated-domain-user", () => ({
  resolveAuthenticatedDomainUser: resolveAuthenticatedDomainUserMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/features/academic-calendar/services/resolve-active-term", () => ({
  getActiveTermId: getActiveTermIdMock,
}));

vi.mock("@/features/enrollments/services/manage-student-enrollments", () => ({
  upsertEnrollmentForActiveTerm: upsertEnrollmentForActiveTermMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    user: {
      update: updateUserMock,
    },
    studentAcademicProfile: {
      upsert: upsertStudentProfileMock,
    },
    userRole: {
      deleteMany: deleteManyUserRoleMock,
      findUnique: findUniqueUserRoleMock,
      create: createUserRoleMock,
    },
    program: {
      findUnique: findUniqueProgramMock,
    },
    major: {
      findUnique: findUniqueMajorMock,
    },
  },
}));

const validAcademicPayload = {
  program_id: "550e8400-e29b-41d4-a716-446655440000",
  major_id: "660e8400-e29b-41d4-a716-446655441111",
  year_level: "FIRST_YEAR" as const,
  section: "MORNING" as const,
};

describe("Onboarding Actions - resetIncompleteRoleClaim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes user roles when profile status is not complete and redirects to /portal", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
      profileGate: { status: "STUDENT_ONBOARDING_REQUIRED" },
    });

    await expect(resetIncompleteRoleClaim()).rejects.toThrow(`${REDIRECT_ERROR}:/portal/respondents`);

    expect(deleteManyUserRoleMock).toHaveBeenCalledWith({
      where: { user_id: "user-123" },
    });
  });

  it("does not delete user roles when profile status is complete and redirects to /portal", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
      profileGate: { status: "COMPLETE" },
    });

    await expect(resetIncompleteRoleClaim()).rejects.toThrow(`${REDIRECT_ERROR}:/portal/respondents`);

    expect(deleteManyUserRoleMock).not.toHaveBeenCalled();
  });

  it("redirects to /portal when there is no authenticated session", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    await expect(resetIncompleteRoleClaim()).rejects.toThrow(`${REDIRECT_ERROR}:/portal/respondents`);

    expect(deleteManyUserRoleMock).not.toHaveBeenCalled();
  });
});

describe("registerStudentProfile Server Action", () => {
  const mockGetUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: {
        getUser: mockGetUser,
      },
    });

    transactionMock.mockImplementation(async (callback: any) => {
      return callback(prisma);
    });

    resolveAuthenticatedDomainUserMock.mockResolvedValue({
      id: "student-123",
      email: "student@acd.edu.ph",
      name: "Jane Doe",
      auth_user_id: "auth-student-123",
      is_active: true,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    findUniqueUserRoleMock.mockResolvedValue(null);

    findUniqueProgramMock.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });

    findUniqueMajorMock.mockResolvedValue({
      id: "660e8400-e29b-41d4-a716-446655441111",
      program_id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: true,
    });

    getActiveTermIdMock.mockResolvedValue("term-123");
    upsertEnrollmentForActiveTermMock.mockResolvedValue({ success: true });
  });

  it("should fail if user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No user" } });

    const result = await registerStudentProfile(validAcademicPayload);

    expect(result.success).toBeUndefined();
    expect(result.error).toBe("Authentication session invalid or missing.");
  });

  it("should fail if the domain user cannot be resolved", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-student-123", email: "student@acd.edu.ph" } },
      error: null,
    });
    resolveAuthenticatedDomainUserMock.mockResolvedValue(null);

    const result = await registerStudentProfile(validAcademicPayload);

    expect(result.error).toContain("account identity could not be resolved");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("should fail if the program does not exist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-student-123", email: "student@acd.edu.ph" } },
      error: null,
    });
    findUniqueProgramMock.mockResolvedValue(null);

    const result = await registerStudentProfile(validAcademicPayload);

    expect(result.success).toBeUndefined();
    expect(result.error).toBe("The selected program does not exist.");
  });

  it("should fail if the program is archived or inactive", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-student-123", email: "student@acd.edu.ph" } },
      error: null,
    });
    findUniqueProgramMock.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: false,
    });

    const result = await registerStudentProfile(validAcademicPayload);

    expect(result.success).toBeUndefined();
    expect(result.error).toBe("The selected program is archived or inactive.");
  });

  it("should fail if the major does not exist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-student-123", email: "student@acd.edu.ph" } },
      error: null,
    });
    findUniqueMajorMock.mockResolvedValue(null);

    const result = await registerStudentProfile(validAcademicPayload);

    expect(result.success).toBeUndefined();
    expect(result.error).toBe("The selected major does not exist.");
  });

  it("should fail if the major is inactive", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-student-123", email: "student@acd.edu.ph" } },
      error: null,
    });
    findUniqueMajorMock.mockResolvedValue({
      id: "660e8400-e29b-41d4-a716-446655441111",
      program_id: "550e8400-e29b-41d4-a716-446655440000",
      is_active: false,
    });

    const result = await registerStudentProfile(validAcademicPayload);

    expect(result.success).toBeUndefined();
    expect(result.error).toBe("The selected major is archived or inactive.");
  });

  it("should fail if the major belongs to a different program", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-student-123", email: "student@acd.edu.ph" } },
      error: null,
    });
    findUniqueMajorMock.mockResolvedValue({
      id: "660e8400-e29b-41d4-a716-446655441111",
      program_id: "different-program-uuid",
      is_active: true,
    });

    const result = await registerStudentProfile(validAcademicPayload);

    expect(result.success).toBeUndefined();
    expect(result.error).toBe("The selected major does not belong to the selected program.");
  });

  it("should register student and create enrollment successfully if active term exists", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-student-123", email: "student@acd.edu.ph" } },
      error: null,
    });

    const result = await registerStudentProfile(validAcademicPayload);

    expect(result.success).toBe(true);
    expect(resolveAuthenticatedDomainUserMock).toHaveBeenCalledWith({
      authUserId: "auth-student-123",
      email: "student@acd.edu.ph",
    });
    expect(transactionMock).toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(findUniqueUserRoleMock).toHaveBeenCalledWith({
      where: { user_id: "student-123" },
    });
    expect(createUserRoleMock).toHaveBeenCalledWith({
      data: {
        user_id: "student-123",
        role: ROLES.STUDENT,
      },
    });
    expect(upsertStudentProfileMock).toHaveBeenCalledWith({
      where: { user_id: "student-123" },
      update: {
        program_id: "550e8400-e29b-41d4-a716-446655440000",
        major_id: "660e8400-e29b-41d4-a716-446655441111",
      },
      create: {
        user_id: "student-123",
        program_id: "550e8400-e29b-41d4-a716-446655440000",
        major_id: "660e8400-e29b-41d4-a716-446655441111",
      },
    });
    expect(upsertEnrollmentForActiveTermMock).toHaveBeenCalledWith({
      studentUserId: "student-123",
      termInstanceId: "term-123",
      programId: "550e8400-e29b-41d4-a716-446655440000",
      majorId: "660e8400-e29b-41d4-a716-446655441111",
      yearLevel: "FIRST_YEAR",
      section: "MORNING",
      source: "ONBOARDING",
    });
  });

  it("preserves the stored canonical name when client identity is injected", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-student-123", email: "student@acd.edu.ph" } },
      error: null,
    });

    const result = await registerStudentProfile({
      ...validAcademicPayload,
      first_name: "Hacker",
      last_name: "Name",
      name: "Hacker Name",
    } as any);

    expect(result.success).toBe(true);
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(upsertStudentProfileMock).toHaveBeenCalled();
  });

  it("rejects registration when an existing non-student role is present", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-student-123", email: "student@acd.edu.ph" } },
      error: null,
    });
    findUniqueUserRoleMock.mockResolvedValue({
      id: "role-123",
      user_id: "student-123",
      role: ROLES.FACULTY,
    });

    const result = await registerStudentProfile(validAcademicPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Your account is already registered with a different role.");
    expect(createUserRoleMock).not.toHaveBeenCalled();
    expect(upsertStudentProfileMock).not.toHaveBeenCalled();
    expect(upsertEnrollmentForActiveTermMock).not.toHaveBeenCalled();
  });

  it("rejects registration when the resolved domain user is inactive", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-student-123", email: "student@acd.edu.ph" } },
      error: null,
    });
    resolveAuthenticatedDomainUserMock.mockResolvedValue({
      id: "student-123",
      email: "student@acd.edu.ph",
      name: "Jane Doe",
      auth_user_id: "auth-student-123",
      is_active: false,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    const result = await registerStudentProfile(validAcademicPayload);

    expect(result.error).toBe("Your CLOIE account is currently inactive.");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("should register student and skip enrollment if no active term exists", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-student-123", email: "student@acd.edu.ph" } },
      error: null,
    });
    getActiveTermIdMock.mockResolvedValue(null);

    const result = await registerStudentProfile({
      program_id: "550e8400-e29b-41d4-a716-446655440000",
      major_id: "",
      year_level: "",
      section: "",
    });

    expect(result.success).toBe(true);
    expect(upsertStudentProfileMock).toHaveBeenCalled();
    expect(upsertEnrollmentForActiveTermMock).not.toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("should fail if the student email domain is not authorized", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-student-123", email: "student@gmail.com" } },
      error: null,
    });

    const result = await registerStudentProfile(validAcademicPayload);

    expect(result.success).toBeUndefined();
    expect(result.error).toBe("Institutional email domain is required for student registration.");
  });

  it("should return failure result if upsertEnrollmentForActiveTerm fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-student-123", email: "student@acdeducation.com" } },
      error: null,
    });
    upsertEnrollmentForActiveTermMock.mockResolvedValue({
      success: false,
      error: "Enrollment transaction failed",
    });

    const result = await registerStudentProfile(validAcademicPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Enrollment transaction failed");
  });

  it("should return client-safe unexpected error message if database transaction fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-student-123", email: "student@acd.edu.ph" } },
      error: null,
    });
    transactionMock.mockRejectedValue(new Error("Db connection lost"));

    const result = await registerStudentProfile(validAcademicPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("An unexpected error occurred while processing your request.");
  });
});
