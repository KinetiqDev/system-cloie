import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveProfileGate } from "@/features/users/services/resolve-profile-gate";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { createFacultyProfile } from "@/lib/actions/faculty-actions";
import { facultyProfileSchema } from "@/lib/schemas/faculty-profile";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";

const { resolveAuthSessionMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
const {
  findUniqueUserMock,
  facultyAccessRequestFindUniqueMock,
  facultyAccessRequestUpdateMock,
  facultyAccessRequestUpsertMock,
  findUniqueProgramMock,
  findFirstAffiliationMock,
  upsertAffiliationMock,
  upsertUserRoleMock,
  transactionMock,
} = vi.hoisted(() => ({
  findUniqueUserMock: vi.fn(),
  facultyAccessRequestFindUniqueMock: vi.fn(),
  facultyAccessRequestUpdateMock: vi.fn(),
  facultyAccessRequestUpsertMock: vi.fn(),
  findUniqueProgramMock: vi.fn(),
  findFirstAffiliationMock: vi.fn(),
  upsertAffiliationMock: vi.fn(),
  upsertUserRoleMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    facultyAccessRequest: {
      findUnique: facultyAccessRequestFindUniqueMock,
      update: facultyAccessRequestUpdateMock,
      upsert: facultyAccessRequestUpsertMock,
    },
    $transaction: transactionMock,
    user: {
      findUnique: findUniqueUserMock,
    },
    userRole: {
      upsert: upsertUserRoleMock,
    },
    facultyProgramAffiliation: {
      findFirst: findFirstAffiliationMock,
      upsert: upsertAffiliationMock,
    },
    program: {
      findUnique: findUniqueProgramMock,
    },
  },
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
  it("routes FACULTY_ONBOARDING_REQUIRED to faculty onboarding", () => {
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

  it("accepts a valid program id", () => {
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
  const validPayload = {
    program_id: "550e8400-e29b-41d4-a716-446655440000",
  };

  function session(overrides: Record<string, unknown> = {}) {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-123",
      email: "teacher@acd.edu.ph",
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
      authMethod: "google",
      profileGate: { status: "FACULTY_ONBOARDING_REQUIRED", intent: "faculty" },
      ...overrides,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueProgramMock.mockResolvedValue({
      id: validPayload.program_id,
      is_active: true,
    });
    findFirstAffiliationMock.mockResolvedValue(null);
    facultyAccessRequestFindUniqueMock.mockResolvedValue({ id: "req-1" });
    facultyAccessRequestUpdateMock.mockResolvedValue({ status: "APPROVED" });
    upsertAffiliationMock.mockResolvedValue({});
    upsertUserRoleMock.mockResolvedValue({});
    transactionMock.mockImplementation((callback: (tx: unknown) => Promise<unknown>) =>
      callback(prisma)
    );
    findUniqueUserMock.mockResolvedValue({ id: "faculty-123", is_active: true });
  });

  it("creates active program affiliation and approves any existing request", async () => {
    session();

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(true);
    expect(upsertUserRoleMock).toHaveBeenCalledWith({
      where: { user_id_role: { user_id: "faculty-123", role: ROLES.FACULTY } },
      update: {},
      create: { user_id: "faculty-123", role: ROLES.FACULTY },
    });
    expect(upsertAffiliationMock).toHaveBeenCalledWith({
      where: {
        faculty_id_program_id: {
          faculty_id: "faculty-123",
          program_id: validPayload.program_id,
        },
      },
      update: { is_primary: true, is_active: true },
      create: {
        faculty_id: "faculty-123",
        program_id: validPayload.program_id,
        is_primary: true,
        is_active: true,
      },
    });
    expect(facultyAccessRequestUpdateMock).toHaveBeenCalledWith({
      where: { user_id: "faculty-123" },
      data: { status: "APPROVED" },
    });
  });

  it("refuses an unauthenticated session", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const result = await createFacultyProfile(validPayload);

    expect(result).toEqual({ success: false, error: "Authentication session invalid or missing." });
    expect(prisma.userRole.upsert).not.toHaveBeenCalled();
  });

  it("refuses a non-Google session before any write", async () => {
    session({ authMethod: "password" });

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toContain("current ACD Google sign-in");
    expect(prisma.userRole.upsert).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses a verified-signup session: Faculty is an internal Google-only role", async () => {
    session({ authMethod: "verified-signup" });

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(prisma.userRole.upsert).not.toHaveBeenCalled();
  });

  it("refuses a non-institutional address before any write", async () => {
    session({ email: "someone@example.com" });

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toContain("institutional");
    expect(prisma.userRole.upsert).not.toHaveBeenCalled();
  });

  it("refuses an inactive account before any write", async () => {
    session();
    findUniqueUserMock.mockResolvedValue({ id: "faculty-123", is_active: false });

    const result = await createFacultyProfile(validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toContain("inactive");
    expect(prisma.userRole.upsert).not.toHaveBeenCalled();
  });

  it("refuses an archived program before any write", async () => {
    session();
    findUniqueProgramMock.mockResolvedValue({
      id: validPayload.program_id,
      is_active: false,
    });

    const result = await createFacultyProfile(validPayload);

    expect(result).toEqual({
      success: false,
      error: "The selected program is archived or inactive.",
    });
    expect(prisma.userRole.upsert).not.toHaveBeenCalled();
  });

  it("refuses a session that is not in FACULTY_ONBOARDING_REQUIRED gate", async () => {
    session({ profileGate: { status: "COMPLETE" } });

    const result = await createFacultyProfile(validPayload);

    expect(result).toEqual({
      success: false,
      error: "This session cannot complete Faculty onboarding. Sign in again and continue.",
    });
    expect(prisma.userRole.upsert).not.toHaveBeenCalled();
  });
});
