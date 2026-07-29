import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";

const {
  getUserMock,
  findUniqueMock,
  findFirstTermInstanceMock,
  findUniqueStudentEnrollmentMock,
  findFirstFacultyAffiliationMock,
  readDemoAuthCookieMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  findFirstTermInstanceMock: vi.fn(),
  findUniqueStudentEnrollmentMock: vi.fn(),
  findFirstFacultyAffiliationMock: vi.fn(),
  readDemoAuthCookieMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock("@/features/auth/services/dev-auth", () => ({
  readDevAuthCookie: vi.fn(async () => null),
}));

vi.mock("@/features/auth/services/demo-auth", () => ({
  getDemoAuthConfig: vi.fn(() => ({
    allowedUsers: new Set(["demo-faculty@cloie.test"]),
  })),
  readDemoAuthCookie: readDemoAuthCookieMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
    },
    academicTermInstance: {
      findFirst: findFirstTermInstanceMock,
    },
    studentEnrollment: {
      findUnique: findUniqueStudentEnrollmentMock,
    },
    facultyProgramAffiliation: {
      findFirst: findFirstFacultyAffiliationMock,
    },
  },
}));

describe("resolveAuthSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    findFirstTermInstanceMock.mockResolvedValue({ id: "term-1" });
    findUniqueStudentEnrollmentMock.mockResolvedValue({ is_active: true });
    findFirstFacultyAffiliationMock.mockResolvedValue({ id: "affiliation-1" });
    readDemoAuthCookieMock.mockResolvedValue(null);
  });

  it("returns null when Supabase returns an auth error", async () => {
    const { resolveAuthSession } = await import("@/features/auth/services/resolve-auth-session");
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: new Error("auth failed"),
    });

    await expect(resolveAuthSession()).resolves.toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("resolves the dedicated demo cookie before consulting Supabase", async () => {
    const { resolveAuthSession } = await import("@/features/auth/services/resolve-auth-session");
    readDemoAuthCookieMock.mockResolvedValue({ userId: "demo-user" });
    findUniqueMock.mockResolvedValue({
      id: "demo-user",
      email: "demo-faculty@cloie.test",
      is_active: true,
      roles: [{ role: ROLES.FACULTY }],
      student_profile: null,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    await expect(resolveAuthSession()).resolves.toMatchObject({
      userId: "demo-user",
      email: "demo-faculty@cloie.test",
      roles: [ROLES.FACULTY],
    });
    expect(getUserMock).not.toHaveBeenCalled();
    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "demo-user" } })
    );
  });

  it("returns role-selection state when the authenticated user has no DB roles", async () => {
    const { resolveAuthSession } = await import("@/features/auth/services/resolve-auth-session");
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@acd.edu.ph" } },
      error: null,
    });
    findUniqueMock.mockResolvedValue({
      roles: [],
      student_profile: null,
    });

    await expect(resolveAuthSession()).resolves.toEqual({
      userId: "user-1",
      email: "user@acd.edu.ph",
      roles: [],
      activeRole: null,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      profileGate: { status: "ROLE_SELECTION_REQUIRED" },
    });
  });

  it("returns onboarding-required state for an authenticated student without a profile", async () => {
    const { resolveAuthSession } = await import("@/features/auth/services/resolve-auth-session");
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-2", email: "student@acd.edu.ph" } },
      error: null,
    });
    findUniqueMock.mockResolvedValue({
      roles: [{ role: ROLES.STUDENT }],
      student_profile: null,
    });

    await expect(resolveAuthSession()).resolves.toEqual({
      userId: "user-2",
      email: "student@acd.edu.ph",
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      profileGate: {
        status: "STUDENT_ONBOARDING_REQUIRED",
        intent: "student",
      },
    });
  });

  it("returns complete state for a student with a profile", async () => {
    const { resolveAuthSession } = await import("@/features/auth/services/resolve-auth-session");
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-3", email: "student@acd.edu.ph" } },
      error: null,
    });
    findUniqueMock.mockResolvedValue({
      roles: [{ role: ROLES.STUDENT }],
      student_profile: { id: "profile-1" },
    });

    await expect(resolveAuthSession()).resolves.toEqual({
      userId: "user-3",
      email: "student@acd.edu.ph",
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      studentProfileId: "profile-1",
      alumniProfileId: null,
      industryPartnerProfileId: null,
      profileGate: { status: "COMPLETE" },
    });
  });

  it("requires onboarding for mixed faculty and student users when the faculty affiliation is missing", async () => {
    const { resolveAuthSession } = await import("@/features/auth/services/resolve-auth-session");
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-4", email: "faculty@acd.edu.ph" } },
      error: null,
    });
    findUniqueMock.mockResolvedValue({
      roles: [{ role: ROLES.FACULTY }, { role: ROLES.STUDENT }],
      student_profile: null,
    });
    findFirstFacultyAffiliationMock.mockResolvedValue(null);

    await expect(resolveAuthSession()).resolves.toEqual({
      userId: "user-4",
      email: "faculty@acd.edu.ph",
      roles: [ROLES.FACULTY, ROLES.STUDENT],
      activeRole: ROLES.FACULTY,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      profileGate: {
        status: "FACULTY_ONBOARDING_REQUIRED",
        intent: "faculty",
      },
    });
  });

  it("filters unknown DB role names out of the session snapshot", async () => {
    const { resolveAuthSession } = await import("@/features/auth/services/resolve-auth-session");
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-5", email: "unknown@acd.edu.ph" } },
      error: null,
    });
    findUniqueMock.mockResolvedValue({
      roles: [{ role: "STALE_ROLE" }],
      student_profile: null,
    });

    await expect(resolveAuthSession()).resolves.toEqual({
      userId: "user-5",
      email: "unknown@acd.edu.ph",
      roles: [],
      activeRole: null,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      profileGate: { status: "ROLE_SELECTION_REQUIRED" },
    });
  });

  it("returns onboarding-required state for a faculty user without a program affiliation", async () => {
    const { resolveAuthSession } = await import("@/features/auth/services/resolve-auth-session");
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-6", email: "faculty@acd.edu.ph" } },
      error: null,
    });
    findUniqueMock.mockResolvedValue({
      roles: [{ role: ROLES.FACULTY }],
      student_profile: null,
    });
    findFirstFacultyAffiliationMock.mockResolvedValue(null);

    await expect(resolveAuthSession()).resolves.toEqual({
      userId: "user-6",
      email: "faculty@acd.edu.ph",
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      profileGate: {
        status: "FACULTY_ONBOARDING_REQUIRED",
        intent: "faculty",
      },
    });
  });

  it("returns complete state for a faculty user with an active program affiliation", async () => {
    const { resolveAuthSession } = await import("@/features/auth/services/resolve-auth-session");
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-7", email: "faculty@acd.edu.ph" } },
      error: null,
    });
    findUniqueMock.mockResolvedValue({
      roles: [{ role: ROLES.FACULTY }],
      student_profile: null,
    });
    findFirstFacultyAffiliationMock.mockResolvedValue({ id: "affiliation-1" });

    await expect(resolveAuthSession()).resolves.toEqual({
      userId: "user-7",
      email: "faculty@acd.edu.ph",
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      profileGate: { status: "COMPLETE" },
    });
  });

  it("does not allow the demo flag to bypass profile gates outside development", async () => {
    const { resolveAuthSessionFromDevUser } =
      await import("@/features/auth/services/resolve-auth-session");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    findUniqueMock.mockResolvedValue({
      roles: [{ role: ROLES.FACULTY }],
      student_profile: null,
    });
    findFirstFacultyAffiliationMock.mockResolvedValue(null);

    await expect(
      resolveAuthSessionFromDevUser({ id: "user-8", email: "demo-faculty@cloie.test" })
    ).resolves.toMatchObject({
      profileGate: {
        status: "FACULTY_ONBOARDING_REQUIRED",
        intent: "faculty",
      },
    });
  });

  it("re-resolves dedicated demo identity and preserves profile gates", async () => {
    const { resolveAuthSessionFromDemoUser } =
      await import("@/features/auth/services/resolve-auth-session");
    findUniqueMock.mockResolvedValue({
      id: "user-9",
      email: "demo-faculty@cloie.test",
      is_active: true,
      roles: [{ role: ROLES.FACULTY }],
      student_profile: null,
      alumni_profile: null,
      industry_partner_profile: null,
    });
    findFirstFacultyAffiliationMock.mockResolvedValue(null);

    await expect(
      resolveAuthSessionFromDemoUser({ id: "user-9", email: null })
    ).resolves.toMatchObject({
      userId: "user-9",
      profileGate: {
        status: "FACULTY_ONBOARDING_REQUIRED",
        intent: "faculty",
      },
    });
    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-9" } })
    );
  });

  it.each([
    [
      "an inactive account",
      {
        roles: [{ role: ROLES.FACULTY }],
        student_profile: null,
        alumni_profile: null,
        industry_partner_profile: null,
        is_active: false,
      },
      { status: "INACTIVE" },
    ],
    [
      "a Student without active enrollment",
      {
        roles: [{ role: ROLES.STUDENT }],
        student_profile: { id: "student-profile" },
        alumni_profile: null,
        industry_partner_profile: null,
        is_active: true,
      },
      { status: "DEFERRED_ENROLLMENT" },
    ],
    [
      "a rejected Alumni account",
      {
        roles: [{ role: ROLES.ALUMNI }],
        student_profile: null,
        alumni_profile: { id: "alumni-profile", verification_status: "REJECTED" },
        industry_partner_profile: null,
        is_active: true,
      },
      { status: "REJECTED_EXTERNAL_ACCOUNT" },
    ],
    [
      "a rejected Industry Partner account",
      {
        roles: [{ role: ROLES.INDUSTRY_PARTNER }],
        student_profile: null,
        alumni_profile: null,
        industry_partner_profile: { id: "industry-profile", verification_status: "REJECTED" },
        is_active: true,
      },
      { status: "REJECTED_EXTERNAL_ACCOUNT" },
    ],
  ])("preserves the normal gate for dedicated demo %s", async (_description, user, profileGate) => {
    const { resolveAuthSessionFromDemoUser } =
      await import("@/features/auth/services/resolve-auth-session");
    findUniqueMock.mockResolvedValue({
      id: "demo-denial-user",
      email: "demo-faculty@cloie.test",
      ...user,
    });
    findUniqueStudentEnrollmentMock.mockResolvedValue(null);
    findFirstFacultyAffiliationMock.mockResolvedValue(null);

    await expect(
      resolveAuthSessionFromDemoUser({ id: "demo-denial-user", email: null })
    ).resolves.toMatchObject({ profileGate });
  });

  it("rejects dedicated demo identity when the current Prisma email is not allowlisted", async () => {
    const { resolveAuthSessionFromDemoUser } =
      await import("@/features/auth/services/resolve-auth-session");
    findUniqueMock.mockResolvedValue({
      id: "user-10",
      email: "unlisted@cloie.test",
      is_active: true,
      roles: [{ role: ROLES.FACULTY }],
      student_profile: null,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    await expect(
      resolveAuthSessionFromDemoUser({ id: "user-10", email: null })
    ).resolves.toBeNull();
  });

  it("derives the active role from the server-side Prisma record, not client input", async () => {
    // Even if the demo cookie resolves a user with FACULTY roles,
    // the session's activeRole must come from the DB — the client
    // never supplies or overrides the role.
    const { resolveAuthSessionFromDemoUser } =
      await import("@/features/auth/services/resolve-auth-session");
    findUniqueMock.mockResolvedValue({
      id: "user-11",
      email: "demo-faculty@cloie.test",
      is_active: true,
      roles: [{ role: ROLES.FACULTY }],
      student_profile: null,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    const session = await resolveAuthSessionFromDemoUser({ id: "user-11", email: null });

    expect(session).not.toBeNull();
    expect(session!.activeRole).toBe(ROLES.FACULTY);
    expect(session!.roles).toEqual([ROLES.FACULTY]);
    // A DEAN role is not present, so the session must not claim it.
    expect(session!.roles).not.toContain(ROLES.DEAN);
    expect(session!.activeRole).not.toBe(ROLES.DEAN);
  });

  it.each(Object.values(ROLES))("resolves a dedicated demo session for %s", async (role) => {
    const { resolveAuthSessionFromDemoUser } =
      await import("@/features/auth/services/resolve-auth-session");
    findUniqueMock.mockResolvedValue({
      id: "user-role",
      email: "demo-faculty@cloie.test",
      is_active: true,
      roles: [{ role }],
      student_profile: role === ROLES.STUDENT ? { id: "student-profile" } : null,
      alumni_profile:
        role === ROLES.ALUMNI ? { id: "alumni-profile", verification_status: "APPROVED" } : null,
      industry_partner_profile:
        role === ROLES.INDUSTRY_PARTNER
          ? { id: "industry-profile", verification_status: "APPROVED" }
          : null,
    });

    await expect(
      resolveAuthSessionFromDemoUser({ id: "user-role", email: null })
    ).resolves.toMatchObject({
      userId: "user-role",
      roles: [role],
      activeRole: role,
      profileGate: { status: "COMPLETE" },
    });
  });
});

describe("dedicated demo authorization boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    findFirstTermInstanceMock.mockResolvedValue({ id: "term-1" });
    findUniqueStudentEnrollmentMock.mockResolvedValue({ is_active: true });
    findFirstFacultyAffiliationMock.mockResolvedValue(null);
    readDemoAuthCookieMock.mockResolvedValue(null);
  });

  it("denies program scope to a dedicated demo Program Head outside their assignments", async () => {
    const { resolveAuthSessionFromDemoUser } =
      await import("@/features/auth/services/resolve-auth-session");
    const { canManageCourseAssignment } = await import(
      "@/features/course-assignments/policies"
    );
    findUniqueMock.mockResolvedValue({
      id: "demo-ph",
      email: "demo-faculty@cloie.test",
      is_active: true,
      roles: [{ role: ROLES.PROGRAM_HEAD }],
      student_profile: null,
      alumni_profile: null,
      industry_partner_profile: null,
    });
    findFirstFacultyAffiliationMock.mockResolvedValue(null);

    const session = await resolveAuthSessionFromDemoUser({ id: "demo-ph", email: null });

    expect(session).not.toBeNull();
    expect(session!.activeRole).toBe(ROLES.PROGRAM_HEAD);
    expect(session!.profileGate.status).toBe("COMPLETE");

    const decision = canManageCourseAssignment(session!, "program-other", []);
    expect(decision).toEqual({ allowed: false, reason: "Course is outside your program scope." });
  });

  it("denies course roster view to a dedicated demo Faculty without matching assignment", async () => {
    const { resolveAuthSessionFromDemoUser } =
      await import("@/features/auth/services/resolve-auth-session");
    const { canViewCourseRoster } = await import(
      "@/features/course-assignments/policies"
    );
    findUniqueMock.mockResolvedValue({
      id: "demo-faculty",
      email: "demo-faculty@cloie.test",
      is_active: true,
      roles: [{ role: ROLES.FACULTY }],
      student_profile: null,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    const session = await resolveAuthSessionFromDemoUser({ id: "demo-faculty", email: null });

    expect(session).not.toBeNull();
    expect(session!.activeRole).toBe(ROLES.FACULTY);
    expect(session!.profileGate.status).toBe("FACULTY_ONBOARDING_REQUIRED");

    const decision = canViewCourseRoster(session!, {
      facultyId: "different-faculty",
      programId: "program-1",
      courseScope: CourseScope.PROGRAM_SPECIFIC,
      isActive: true,
    });
    expect(decision).toEqual({ allowed: false, reason: "Course assignment not found." });
  });

  it("denies course assignment creation to a dedicated demo Faculty", async () => {
    const { resolveAuthSessionFromDemoUser } =
      await import("@/features/auth/services/resolve-auth-session");
    const { canManageCourseAssignment } = await import(
      "@/features/course-assignments/policies"
    );
    findUniqueMock.mockResolvedValue({
      id: "demo-faculty",
      email: "demo-faculty@cloie.test",
      is_active: true,
      roles: [{ role: ROLES.FACULTY }],
      student_profile: null,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    const session = await resolveAuthSessionFromDemoUser({ id: "demo-faculty", email: null });

    expect(session).not.toBeNull();
    expect(session!.activeRole).toBe(ROLES.FACULTY);

    const decision = canManageCourseAssignment(session!, "program-1", []);
    expect(decision).toEqual({ allowed: false, reason: "Insufficient permissions." });
  });
});
