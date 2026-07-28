import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const { getUserMock, findUniqueMock, findFirstTermInstanceMock, findUniqueStudentEnrollmentMock, findFirstFacultyAffiliationMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  findFirstTermInstanceMock: vi.fn(),
  findUniqueStudentEnrollmentMock: vi.fn(),
  findFirstFacultyAffiliationMock: vi.fn(),
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
    const { resolveAuthSessionFromDevUser } = await import("@/features/auth/services/resolve-auth-session");
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
});
