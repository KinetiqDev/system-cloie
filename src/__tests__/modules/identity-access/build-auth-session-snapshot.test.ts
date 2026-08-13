import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { buildAuthSessionSnapshot } from "@/features/auth/services/build-auth-session-snapshot";

describe("buildAuthSessionSnapshot", () => {
  it("marks users without roles as requiring role selection", () => {
    const session = buildAuthSessionSnapshot({
      userId: "user-1",
      email: "user@acd.edu.ph",
      roles: [],
      studentProfileId: null,
    });

    expect(session.activeRole).toBeNull();
    expect(session.profileGate).toEqual({ status: "ROLE_SELECTION_REQUIRED" });
  });

  it("marks students without a profile as requiring onboarding", () => {
    const session = buildAuthSessionSnapshot({
      userId: "user-2",
      email: "student@acd.edu.ph",
      roles: [ROLES.STUDENT],
      studentProfileId: null,
    });

    expect(session.activeRole).toBe(ROLES.STUDENT);
    expect(session.profileGate).toEqual({
      status: "STUDENT_ONBOARDING_REQUIRED",
      intent: "student",
    });
  });

  it("marks students with a profile as complete", () => {
    const session = buildAuthSessionSnapshot({
      userId: "user-3",
      email: "student@acd.edu.ph",
      roles: [ROLES.STUDENT],
      studentProfileId: "profile-1",
    });

    expect(session.activeRole).toBe(ROLES.STUDENT);
    expect(session.profileGate).toEqual({ status: "COMPLETE" });
  });

  it("exposes external verification statuses already resolved for the request", () => {
    const session = buildAuthSessionSnapshot({
      userId: "alumni-1",
      email: "alumni@example.com",
      roles: [ROLES.ALUMNI],
      studentProfileId: null,
      alumniProfileId: "alumni-profile-1",
      alumniVerificationStatus: "PENDING",
    });

    expect(session.alumniVerificationStatus).toBe("PENDING");
    expect(session.industryPartnerVerificationStatus).toBeNull();
    expect(session.profileGate).toEqual({ status: "COMPLETE" });
  });

  it("allows faculty users without student profiles", () => {
    const session = buildAuthSessionSnapshot({
      userId: "user-5",
      email: "faculty@acd.edu.ph",
      roles: [ROLES.FACULTY],
      studentProfileId: null,
      hasFacultyAffiliation: true,
    });

    expect(session.activeRole).toBe(ROLES.FACULTY);
    expect(session.profileGate).toEqual({ status: "COMPLETE" });
  });

  it("requires faculty onboarding when hasFacultyAffiliation is false", () => {
    const session = buildAuthSessionSnapshot({
      userId: "user-6",
      email: "faculty@acd.edu.ph",
      roles: [ROLES.FACULTY],
      studentProfileId: null,
      hasFacultyAffiliation: false,
    });

    expect(session.activeRole).toBe(ROLES.FACULTY);
    expect(session.profileGate).toEqual({
      status: "FACULTY_ONBOARDING_REQUIRED",
      intent: "faculty",
    });
  });

  it("never bypasses profile gates for seeded catalog emails", () => {
    const session = buildAuthSessionSnapshot({
      userId: "demo-user",
      email: "demo-faculty@cloie.test",
      roles: [ROLES.FACULTY],
      studentProfileId: null,
      hasFacultyAffiliation: false,
    });

    expect(session.profileGate).toEqual({
      status: "FACULTY_ONBOARDING_REQUIRED",
      intent: "faculty",
    });
  });

  it.each([
    [
      "inactive account",
      {
        roles: [ROLES.FACULTY] as const,
        studentProfileId: null,
        isActive: false,
        hasFacultyAffiliation: true,
      },
      { status: "INACTIVE" as const },
    ],
    [
      "rejected alumni",
      {
        roles: [ROLES.ALUMNI] as const,
        studentProfileId: null,
        alumniProfileId: "alumni-profile",
        alumniVerificationStatus: "REJECTED" as const,
        isActive: true,
      },
      { status: "REJECTED_EXTERNAL_ACCOUNT" as const },
    ],
    [
      "deferred student enrollment",
      {
        roles: [ROLES.STUDENT] as const,
        studentProfileId: "student-profile",
        isActive: true,
        hasActiveEnrollment: false,
      },
      { status: "DEFERRED_ENROLLMENT" as const },
    ],
  ])("preserves normal gate for development fixture %s", (_label, input, profileGate) => {
    const session = buildAuthSessionSnapshot({
      userId: "fixture-user",
      email: "demo-student@cloie.test",
      ...input,
      roles: [...input.roles],
    });

    expect(session.profileGate).toEqual(profileGate);
  });

  it("regression check: uses only the first role if multiple roles are provided (ignores stack priority resolution)", () => {
    const session = buildAuthSessionSnapshot({
      userId: "user-regression",
      email: "regression@acd.edu.ph",
      roles: [ROLES.STUDENT, ROLES.FACULTY],
      studentProfileId: "profile-1",
    });

    // It should select STUDENT (roles[0]) as the activeRole, even though FACULTY used to have higher priority in resolution
    expect(session.activeRole).toBe(ROLES.STUDENT);
    expect(session.profileGate).toEqual({ status: "COMPLETE" });
  });

  it("stores the provided canonical name and never invents one from email", () => {
    const withName = buildAuthSessionSnapshot({
      userId: "user-name",
      email: "juan.dela.cruz@acd.edu.ph",
      name: "Juan Dela Cruz",
      roles: [ROLES.STUDENT],
      studentProfileId: "profile-1",
    });
    const withoutName = buildAuthSessionSnapshot({
      userId: "user-no-name",
      email: "orphan@acd.edu.ph",
      roles: [ROLES.STUDENT],
      studentProfileId: null,
    });
    const blankName = buildAuthSessionSnapshot({
      userId: "user-blank",
      email: "blank@acd.edu.ph",
      name: "   ",
      roles: [ROLES.FACULTY],
      studentProfileId: null,
      hasFacultyAffiliation: true,
    });

    expect(withName.name).toBe("Juan Dela Cruz");
    expect(withoutName.name).toBeNull();
    expect(blankName.name).toBeNull();
    expect(withoutName.name).not.toBe("orphan");
  });
});
