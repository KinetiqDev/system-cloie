import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetIncompleteRoleClaim } from "@/lib/actions/onboarding-actions";
import { ROLES } from "@/lib/constants/roles";

const REDIRECT_ERROR = "NEXT_REDIRECT";

const {
  redirectMock,
  resolveAuthSessionMock,
  deleteManyUserRoleMock,
  deleteUserRoleMock,
  findUniqueStudentProfileMock,
  findFirstFacultyAffiliationMock,
  findUniqueAlumniProfileMock,
  findUniqueIndustryPartnerProfileMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`${REDIRECT_ERROR}:${path}`);
  }),
  resolveAuthSessionMock: vi.fn(),
  deleteManyUserRoleMock: vi.fn(),
  deleteUserRoleMock: vi.fn(),
  findUniqueStudentProfileMock: vi.fn(),
  findFirstFacultyAffiliationMock: vi.fn(),
  findUniqueAlumniProfileMock: vi.fn(),
  findUniqueIndustryPartnerProfileMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    studentAcademicProfile: {
      findUnique: findUniqueStudentProfileMock,
    },
    facultyProgramAffiliation: {
      findFirst: findFirstFacultyAffiliationMock,
    },
    alumniProfile: {
      findUnique: findUniqueAlumniProfileMock,
    },
    industryPartnerProfile: {
      findUnique: findUniqueIndustryPartnerProfileMock,
    },
    userRole: {
      deleteMany: deleteManyUserRoleMock,
      delete: deleteUserRoleMock,
    },
  },
}));

describe("resetIncompleteRoleClaim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueStudentProfileMock.mockResolvedValue(null);
    findFirstFacultyAffiliationMock.mockResolvedValue(null);
    findUniqueAlumniProfileMock.mockResolvedValue(null);
    findUniqueIndustryPartnerProfileMock.mockResolvedValue(null);
  });

  it("deletes an incomplete faculty claim and redirects to staff sign-in", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-123",
      email: "faculty@acd.edu.ph",
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
      profileGate: { status: "FACULTY_ONBOARDING_REQUIRED", intent: "faculty" },
    });

    await expect(resetIncompleteRoleClaim()).rejects.toThrow(`${REDIRECT_ERROR}:/login/staff`);

    expect(deleteUserRoleMock).toHaveBeenCalledWith({
      where: { user_id_role: { user_id: "user-123", role: ROLES.FACULTY } },
    });
    expect(deleteManyUserRoleMock).not.toHaveBeenCalled();
  });

  it("deletes an incomplete alumni claim and redirects to the landing", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-123",
      email: "alumni@example.com",
      roles: [ROLES.ALUMNI],
      activeRole: ROLES.ALUMNI,
      profileGate: { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" },
    });

    await expect(resetIncompleteRoleClaim()).rejects.toThrow(`${REDIRECT_ERROR}:/`);

    expect(deleteUserRoleMock).toHaveBeenCalledWith({
      where: { user_id_role: { user_id: "user-123", role: ROLES.ALUMNI } },
    });
  });

  it("never treats a Student claim as incomplete: Student placement has no self-service form to abandon", async () => {
    // Student placement is institution-recorded (issue #649), so there is no
    // profile artifact a Student could abandon and no reason to delete the
    // role. Deleting it here would strip a legitimately provisioned Student.
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-123",
      email: "student@acd.edu.ph",
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      profileGate: { status: "STUDENT_PLACEMENT_REQUIRED" },
    });

    await expect(resetIncompleteRoleClaim()).rejects.toThrow(`${REDIRECT_ERROR}:/`);

    expect(deleteUserRoleMock).not.toHaveBeenCalled();
    expect(findUniqueStudentProfileMock).not.toHaveBeenCalled();
  });

  it("does not delete roles when the session has no active role", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-123",
      email: "faculty@acd.edu.ph",
      roles: [ROLES.FACULTY],
      activeRole: null,
      profileGate: { status: "ROLE_SELECTION_REQUIRED" },
    });

    await expect(resetIncompleteRoleClaim()).rejects.toThrow(`${REDIRECT_ERROR}:/`);

    expect(deleteUserRoleMock).not.toHaveBeenCalled();
    expect(deleteManyUserRoleMock).not.toHaveBeenCalled();
  });

  it("redirects to the landing when there is no authenticated session", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    await expect(resetIncompleteRoleClaim()).rejects.toThrow(`${REDIRECT_ERROR}:/`);

    expect(deleteUserRoleMock).not.toHaveBeenCalled();
    expect(deleteManyUserRoleMock).not.toHaveBeenCalled();
  });

  it("deletes the requested incomplete role when the cookie resolves to a complete role", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-123",
      email: "person@example.com",
      roles: [ROLES.FACULTY, ROLES.ALUMNI],
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
    });
    findUniqueAlumniProfileMock.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("role", ROLES.ALUMNI);

    await expect(resetIncompleteRoleClaim(formData)).rejects.toThrow(`${REDIRECT_ERROR}:/`);

    expect(deleteUserRoleMock).toHaveBeenCalledWith({
      where: { user_id_role: { user_id: "user-123", role: ROLES.ALUMNI } },
    });
  });

  it("ignores a requested role that is not assigned to the user", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-123",
      email: "person@example.com",
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
    });
    const formData = new FormData();
    formData.set("role", ROLES.ALUMNI);

    await expect(resetIncompleteRoleClaim(formData)).rejects.toThrow(
      `${REDIRECT_ERROR}:/login/staff`
    );

    expect(deleteUserRoleMock).not.toHaveBeenCalled();
    expect(findUniqueAlumniProfileMock).not.toHaveBeenCalled();
  });

  it("keeps a requested role that already has a completed profile", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-123",
      email: "person@example.com",
      roles: [ROLES.FACULTY, ROLES.ALUMNI],
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
    });
    findUniqueAlumniProfileMock.mockResolvedValue({ id: "profile-1" });
    const formData = new FormData();
    formData.set("role", ROLES.ALUMNI);

    await expect(resetIncompleteRoleClaim(formData)).rejects.toThrow(`${REDIRECT_ERROR}:/`);

    expect(deleteUserRoleMock).not.toHaveBeenCalled();
  });
});
