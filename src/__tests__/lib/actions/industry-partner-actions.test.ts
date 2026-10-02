import { describe, it, expect, vi, beforeEach } from "vitest";
import { createIndustryPartnerProfile } from "@/lib/actions/industry-partner-actions";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";

const { resolveAuthSessionMock, findManyProgramMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  findManyProgramMock: vi.fn(),
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
      findMany: findManyProgramMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

const validPayload = {
  company_name: "Test Corp",
  position: "Manager",
  program_id: "550e8400-e29b-41d4-a716-446655440000",
};

/** A session that is genuinely inside Industry Partner onboarding. */
function industryPartnerOnboardingSession(overrides: Record<string, unknown> = {}) {
  resolveAuthSessionMock.mockResolvedValue({
    userId: "user-123",
    email: "test@example.com",
    name: "Jane Doe",
    roles: [ROLES.INDUSTRY_PARTNER],
    activeRole: ROLES.INDUSTRY_PARTNER,
    authMethod: "password",
    profileGate: { status: "INDUSTRY_PARTNER_ONBOARDING_REQUIRED", intent: "industry-partner" },
    ...overrides,
  });
}

describe("createIndustryPartnerProfile Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    industryPartnerOnboardingSession();
    findManyProgramMock.mockResolvedValue([{ id: validPayload.program_id, is_active: true }]);
    vi.mocked(prisma.$transaction).mockImplementation(
      (callback) => callback(prisma) as ReturnType<typeof prisma.$transaction>
    );
    vi.mocked(prisma.industryPartnerProfile.upsert).mockResolvedValue({
      id: "ip-profile-1",
    } as never);
    vi.mocked(prisma.industryPartnerProgramAffiliation.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.industryPartnerProgramAffiliation.createMany).mockResolvedValue({ count: 1 });
  });

  it("writes the profile and affiliations for the session's own account and grants no role", async () => {
    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(true);
    expect(prisma.industryPartnerProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: "user-123" },
        create: expect.objectContaining({ user_id: "user-123", company_name: "Test Corp" }),
      })
    );
    // The role was assigned during verified registration; this action never
    // creates or grants it.
    expect(prisma.userRole.create).not.toHaveBeenCalled();
    expect(prisma.userRole.upsert).not.toHaveBeenCalled();
  });

  it("refuses an unauthenticated session before any write", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result).toEqual({ success: false, error: "Authentication session invalid or missing." });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses a raw one-time-code session before any write", async () => {
    // GoTrue emits `otp` for a raw signup or recovery code session. Only the
    // signed signup proof upgrades it, so this session carries no workspace
    // authority (issue #649).
    industryPartnerOnboardingSession({
      authMethod: "otp",
      profileGate: { status: "AUTH_METHOD_MISMATCH", role: ROLES.INDUSTRY_PARTNER },
    });

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses a recovery-confined session before any write", async () => {
    industryPartnerOnboardingSession({
      authMethod: "recovery",
      profileGate: { status: "AUTH_METHOD_MISMATCH", role: ROLES.INDUSTRY_PARTNER },
    });

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses an unproved session before any write", async () => {
    industryPartnerOnboardingSession({
      authMethod: null,
      profileGate: { status: "AUTH_METHOD_MISMATCH", role: ROLES.INDUSTRY_PARTNER },
    });

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses when Industry Partner is assigned but is not the selected active role", async () => {
    industryPartnerOnboardingSession({
      roles: [ROLES.INDUSTRY_PARTNER, ROLES.ALUMNI],
      activeRole: ROLES.ALUMNI,
    });

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses when another role's onboarding gate is open", async () => {
    industryPartnerOnboardingSession({
      profileGate: { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" },
    });

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("reports an inactive account before any write", async () => {
    industryPartnerOnboardingSession({ profileGate: { status: "INACTIVE" } });

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result).toEqual({
      success: false,
      error: "Your System CLOIE account is currently inactive.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("reports a rejected account before any write", async () => {
    industryPartnerOnboardingSession({ profileGate: { status: "REJECTED_EXTERNAL_ACCOUNT" } });

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result).toEqual({
      success: false,
      error: "Your registration application was not approved.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses a program that does not exist", async () => {
    findManyProgramMock.mockResolvedValue([]);

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses an archived program", async () => {
    findManyProgramMock.mockResolvedValue([{ id: validPayload.program_id, is_active: false }]);

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result.success).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("syncs every submitted program affiliation", async () => {
    const secondProgramId = "660e8400-e29b-41d4-a716-446655441111";
    findManyProgramMock.mockResolvedValue([
      { id: validPayload.program_id, is_active: true },
      { id: secondProgramId, is_active: true },
    ]);

    const result = await createIndustryPartnerProfile({
      ...validPayload,
      program_ids: [validPayload.program_id, secondProgramId],
    });

    expect(result.success).toBe(true);
    expect(prisma.industryPartnerProgramAffiliation.createMany).toHaveBeenCalledWith({
      data: [
        { industry_partner_id: "user-123", program_id: validPayload.program_id },
        { industry_partner_id: "user-123", program_id: secondProgramId },
      ],
      skipDuplicates: true,
    });
  });

  it("strips client-injected identity fields", async () => {
    await createIndustryPartnerProfile({
      ...validPayload,
      first_name: "Hacker",
      last_name: "Name",
      name: "Injected",
    } as never);

    expect(prisma.industryPartnerProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.not.objectContaining({
          first_name: expect.anything(),
          last_name: expect.anything(),
          name: expect.anything(),
        }),
      })
    );
  });

  it("returns a client-safe message when the write throws", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("Db connection lost"));

    const result = await createIndustryPartnerProfile(validPayload);

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred while processing your request.",
    });
  });
});
