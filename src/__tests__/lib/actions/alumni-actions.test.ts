import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAlumniProfile } from "@/lib/actions/alumni-actions";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";

const { resolveAuthSessionMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
}));

const { findUniqueProgramMock, findUniqueMajorMock, upsertAlumniProfileMock } = vi.hoisted(() => ({
  findUniqueProgramMock: vi.fn(),
  findUniqueMajorMock: vi.fn(),
  upsertAlumniProfileMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      update: vi.fn(),
    },
    alumniProfile: {
      upsert: upsertAlumniProfileMock,
    },
    userRole: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    program: {
      findUnique: findUniqueProgramMock,
    },
    major: {
      findUnique: findUniqueMajorMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

const validPayload = {
  graduation_year: 2020,
  program_id: "550e8400-e29b-41d4-a716-446655440000",
};

/** A session that is genuinely inside Alumni onboarding. */
function alumniOnboardingSession(overrides: Record<string, unknown> = {}) {
  resolveAuthSessionMock.mockResolvedValue({
    userId: "user-123",
    email: "test@example.com",
    name: "John Doe",
    roles: [ROLES.ALUMNI],
    activeRole: ROLES.ALUMNI,
    authMethod: "password",
    profileGate: { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" },
    ...overrides,
  });
}

describe("createAlumniProfile Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    alumniOnboardingSession();
    findUniqueProgramMock.mockResolvedValue({
      id: validPayload.program_id,
      is_active: true,
    });
    findUniqueMajorMock.mockResolvedValue({
      id: "660e8400-e29b-41d4-a716-446655441111",
      program_id: validPayload.program_id,
      is_active: true,
    });
    upsertAlumniProfileMock.mockResolvedValue({ id: "alumni-profile-1" });
  });

  it("writes the alumni profile for the session's own account and grants no role", async () => {
    const result = await createAlumniProfile(validPayload);

    expect(result.success).toBe(true);
    expect(upsertAlumniProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: "user-123" },
        create: expect.objectContaining({ user_id: "user-123" }),
      })
    );
    // The role was assigned during verified registration; this action never
    // creates or grants it.
    expect(prisma.userRole.create).not.toHaveBeenCalled();
    expect(prisma.userRole.upsert).not.toHaveBeenCalled();
  });

  it("refuses an unauthenticated session before any write", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const result = await createAlumniProfile(validPayload);

    expect(result).toEqual({ success: false, error: "Authentication session invalid or missing." });
    expect(upsertAlumniProfileMock).not.toHaveBeenCalled();
  });

  it("refuses a raw one-time-code session before any write", async () => {
    // GoTrue emits `otp` for a raw signup or recovery code session. Only the
    // signed signup proof upgrades it, so this session carries no workspace
    // authority (issue #649).
    alumniOnboardingSession({
      authMethod: "otp",
      profileGate: { status: "AUTH_METHOD_MISMATCH", role: ROLES.ALUMNI },
    });

    const result = await createAlumniProfile(validPayload);

    expect(result.success).toBe(false);
    expect(upsertAlumniProfileMock).not.toHaveBeenCalled();
  });

  it("refuses a recovery-confined session before any write", async () => {
    alumniOnboardingSession({
      authMethod: "recovery",
      profileGate: { status: "AUTH_METHOD_MISMATCH", role: ROLES.ALUMNI },
    });

    const result = await createAlumniProfile(validPayload);

    expect(result.success).toBe(false);
    expect(upsertAlumniProfileMock).not.toHaveBeenCalled();
  });

  it("refuses an unproved session before any write", async () => {
    alumniOnboardingSession({
      authMethod: null,
      profileGate: { status: "AUTH_METHOD_MISMATCH", role: ROLES.ALUMNI },
    });

    const result = await createAlumniProfile(validPayload);

    expect(result.success).toBe(false);
    expect(upsertAlumniProfileMock).not.toHaveBeenCalled();
  });

  it("refuses when Alumni is assigned but is not the selected active role", async () => {
    alumniOnboardingSession({
      roles: [ROLES.ALUMNI, ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
    });

    const result = await createAlumniProfile(validPayload);

    expect(result.success).toBe(false);
    expect(upsertAlumniProfileMock).not.toHaveBeenCalled();
  });

  it("refuses when another role's onboarding gate is open", async () => {
    alumniOnboardingSession({
      roles: [ROLES.ALUMNI],
      activeRole: ROLES.ALUMNI,
      profileGate: { status: "INDUSTRY_PARTNER_ONBOARDING_REQUIRED", intent: "industry-partner" },
    });

    const result = await createAlumniProfile(validPayload);

    expect(result.success).toBe(false);
    expect(upsertAlumniProfileMock).not.toHaveBeenCalled();
  });

  it("reports an inactive account before any write", async () => {
    alumniOnboardingSession({ profileGate: { status: "INACTIVE" } });

    const result = await createAlumniProfile(validPayload);

    expect(result).toEqual({
      success: false,
      error: "Your System CLOIE account is currently inactive.",
    });
    expect(upsertAlumniProfileMock).not.toHaveBeenCalled();
  });

  it("reports a rejected account before any write", async () => {
    alumniOnboardingSession({ profileGate: { status: "REJECTED_EXTERNAL_ACCOUNT" } });

    const result = await createAlumniProfile(validPayload);

    expect(result).toEqual({
      success: false,
      error: "Your registration application was not approved.",
    });
    expect(upsertAlumniProfileMock).not.toHaveBeenCalled();
  });

  it("refuses a program that does not exist", async () => {
    findUniqueProgramMock.mockResolvedValue(null);

    const result = await createAlumniProfile(validPayload);

    expect(result).toEqual({ success: false, error: "The selected program does not exist." });
    expect(upsertAlumniProfileMock).not.toHaveBeenCalled();
  });

  it("refuses an archived program", async () => {
    findUniqueProgramMock.mockResolvedValue({ id: validPayload.program_id, is_active: false });

    const result = await createAlumniProfile(validPayload);

    expect(result).toEqual({
      success: false,
      error: "The selected program is archived or inactive.",
    });
    expect(upsertAlumniProfileMock).not.toHaveBeenCalled();
  });

  it("refuses a major that is archived", async () => {
    findUniqueMajorMock.mockResolvedValue({
      id: "660e8400-e29b-41d4-a716-446655441111",
      program_id: validPayload.program_id,
      is_active: false,
    });

    const result = await createAlumniProfile({
      ...validPayload,
      major_id: "660e8400-e29b-41d4-a716-446655441111",
    });

    expect(result).toEqual({
      success: false,
      error: "The selected major is archived or inactive.",
    });
    expect(upsertAlumniProfileMock).not.toHaveBeenCalled();
  });

  it("refuses a major belonging to another program", async () => {
    findUniqueMajorMock.mockResolvedValue({
      id: "660e8400-e29b-41d4-a716-446655441111",
      program_id: "99999999-9999-4199-8999-999999999999",
      is_active: true,
    });

    const result = await createAlumniProfile({
      ...validPayload,
      major_id: "660e8400-e29b-41d4-a716-446655441111",
    });

    expect(result).toEqual({
      success: false,
      error: "The selected major does not belong to the selected program.",
    });
    expect(upsertAlumniProfileMock).not.toHaveBeenCalled();
  });

  it("strips client-injected identity fields", async () => {
    await createAlumniProfile({
      ...validPayload,
      first_name: "Hacker",
      last_name: "Name",
      name: "Injected",
    } as never);

    expect(upsertAlumniProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.not.objectContaining({
          first_name: expect.anything(),
          last_name: expect.anything(),
          name: expect.anything(),
        }),
      })
    );
  });

  it("reports an existing profile when the unique constraint fires", async () => {
    upsertAlumniProfileMock.mockRejectedValue(createPrismaUniqueConstraintError());

    const result = await createAlumniProfile(validPayload);

    expect(result).toEqual({ success: false, error: "You already have an alumni profile." });
  });

  it("returns a client-safe message when the write throws", async () => {
    upsertAlumniProfileMock.mockRejectedValue(new Error("Db connection lost"));

    const result = await createAlumniProfile(validPayload);

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred while processing your request.",
    });
  });
});
