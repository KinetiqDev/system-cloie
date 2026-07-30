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

  it("does not bypass profile gates for dedicated demo sessions", () => {
    const session = buildAuthSessionSnapshot({
      userId: "demo-user",
      email: "demo-faculty@cloie.test",
      roles: [ROLES.FACULTY],
      studentProfileId: null,
      hasFacultyAffiliation: false,
      isDemoUser: true,
      isDedicatedDemo: true,
    });

    expect(session.profileGate).toEqual({
      status: "FACULTY_ONBOARDING_REQUIRED",
      intent: "faculty",
    });
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
});
