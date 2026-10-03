import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { resolveProfileGate } from "@/features/users/services/resolve-profile-gate";
import { buildAuthSessionSnapshot } from "@/features/auth/services/build-auth-session-snapshot";
import {
  resolveAuthMethodFromClaims,
  resolveAuthMethodForSession,
} from "@/features/auth/services/resolve-auth-method";

describe("Faculty approval state (issue #649)", () => {
  it("blocks the Faculty workspace while a self-request is pending", () => {
    const gate = resolveProfileGate({
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      facultyApprovalStatus: "PENDING",
    });

    expect(gate).toEqual({ status: "FACULTY_APPROVAL_PENDING" });
  });

  it("surfaces a rejected self-request and blocks the Faculty workspace", () => {
    const gate = resolveProfileGate({
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      facultyApprovalStatus: "REJECTED",
    });

    expect(gate).toEqual({ status: "FACULTY_REQUEST_REJECTED" });
  });

  it("keeps a Secretary-provisioned Faculty account immediate with no request row", () => {
    const gate = resolveProfileGate({
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      facultyApprovalStatus: null,
      hasFacultyAffiliation: true,
    });

    expect(gate).toEqual({ status: "COMPLETE" });
  });

  it("scopes the pending state to Faculty and leaves other assigned roles usable", () => {
    const alumniGate = resolveProfileGate({
      roles: [ROLES.FACULTY, ROLES.ALUMNI],
      activeRole: ROLES.ALUMNI,
      studentProfileId: null,
      alumniProfileId: "alumni-profile",
      industryPartnerProfileId: null,
      facultyApprovalStatus: "PENDING",
    });

    expect(alumniGate).toEqual({ status: "COMPLETE" });
  });

  it("never reports COMPLETE for a pending Faculty request even with an affiliation", () => {
    const gate = resolveProfileGate({
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      facultyApprovalStatus: "PENDING",
      hasFacultyAffiliation: true,
    });

    expect(gate).toEqual({ status: "FACULTY_APPROVAL_PENDING" });
  });
});

describe("auth method enforcement", () => {
  it("resolves a Google OAuth session from amr oauth plus the recorded provider", () => {
    // GoTrue reports every OAuth provider as the single method "oauth"; the
    // provider is only in app_metadata.
    expect(
      resolveAuthMethodFromClaims({
        amr: [{ method: "oauth" }],
        app_metadata: { provider: "google", providers: ["google"] },
      })
    ).toBe("google");
    expect(resolveAuthMethodFromClaims({ amr: [{ method: "password" }] })).toBe("password");
    expect(resolveAuthMethodFromClaims({ amr: [{ method: "otp" }] })).toBe("otp");
    expect(resolveAuthMethodFromClaims({ amr: [{ method: "recovery" }] })).toBe("recovery");
  });

  it("keeps recovery confinement when recovery appears with another method", () => {
    expect(
      resolveAuthMethodFromClaims({
        amr: [{ method: "password" }, { method: "recovery" }],
      })
    ).toBe("recovery");
  });

  it("keeps ambiguous OTP sessions confined when password is also recorded", () => {
    expect(resolveAuthMethodFromClaims({ amr: [{ method: "password" }, { method: "otp" }] })).toBe(
      "otp"
    );
  });

  it("refuses Google proof when an unknown method accompanies OAuth", () => {
    expect(
      resolveAuthMethodFromClaims({
        amr: [{ method: "oauth" }, { method: "unknown" }],
        app_metadata: { provider: "google" },
      })
    ).toBeNull();
  });

  it("refuses an oauth session from any provider other than Google", () => {
    // Adversarial: a code replayed from another enabled OAuth provider must
    // never be accepted as a Google sign-in.
    expect(
      resolveAuthMethodFromClaims({
        amr: [{ method: "oauth" }],
        app_metadata: { provider: "github" },
      })
    ).toBeNull();
    expect(
      resolveAuthMethodFromClaims({
        amr: [{ method: "oauth" }],
        app_metadata: { provider: "apple" },
      })
    ).toBeNull();
  });

  it("refuses an oauth session with no recorded provider, and never trusts user_metadata", () => {
    expect(resolveAuthMethodFromClaims({ amr: [{ method: "oauth" }] })).toBeNull();
    expect(
      resolveAuthMethodFromClaims({
        amr: [{ method: "oauth" }],
        app_metadata: {},
      })
    ).toBeNull();
    // user_metadata is user-editable and must never prove a provider.
    expect(
      resolveAuthMethodFromClaims({
        amr: [{ method: "password" }],
        user_metadata: { provider: "google", sub: "forged" },
        app_metadata: { provider: "google" },
      })
    ).toBe("password");
    expect(
      resolveAuthMethodFromClaims({
        amr: [{ method: "oauth" }],
        user_metadata: { provider: "google" },
      })
    ).toBeNull();
  });

  it("prefers a proved non-oauth method when both are present in the claim", () => {
    expect(
      resolveAuthMethodFromClaims({
        amr: [{ method: "oauth" }, { method: "password" }],
        app_metadata: { provider: "google" },
      })
    ).toBe("password");
  });

  it("treats a missing or unusable amr claim as unproved", () => {
    expect(resolveAuthMethodFromClaims(null)).toBeNull();
    expect(resolveAuthMethodFromClaims({})).toBeNull();
    expect(resolveAuthMethodFromClaims({ amr: [] })).toBeNull();
    expect(resolveAuthMethodFromClaims({ amr: [{ method: 42 }] })).toBeNull();
  });

  it("resolves fixture sessions as google and real sessions from their claims", () => {
    expect(resolveAuthMethodForSession("dedicated-demo", null)).toBe("google");
    expect(resolveAuthMethodForSession("ci-test", null)).toBe("google");
    expect(resolveAuthMethodForSession("oauth", { amr: [{ method: "password" }] })).toBe(
      "password"
    );
  });

  it.each([
    ROLES.STUDENT,
    ROLES.FACULTY,
    ROLES.SECRETARY,
    ROLES.DEAN,
    ROLES.PROGRAM_HEAD,
    ROLES.GEN_ED_COORDINATOR,
  ])("refuses a password session for internal role %s", (role) => {
    const session = buildAuthSessionSnapshot({
      userId: "user-internal",
      email: "person@acd.edu.ph",
      roles: [role],
      studentProfileId: "student-profile",
      hasActiveEnrollment: true,
      hasFacultyAffiliation: true,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      authMethod: "password",
    });

    expect(session.profileGate).toEqual({ status: "AUTH_METHOD_MISMATCH", role });
  });

  it.each(["otp", "recovery"] as const)(
    "refuses a %s session for an internal role",
    (authMethod) => {
      const session = buildAuthSessionSnapshot({
        userId: "user-internal",
        email: "person@acd.edu.ph",
        roles: [ROLES.SECRETARY],
        studentProfileId: null,
        alumniProfileId: null,
        industryPartnerProfileId: null,
        authMethod,
      });

      expect(session.profileGate).toEqual({
        status: "AUTH_METHOD_MISMATCH",
        role: ROLES.SECRETARY,
      });
    }
  );

  it.each([ROLES.ALUMNI, ROLES.INDUSTRY_PARTNER])(
    "allows a password session for external role %s",
    (role) => {
      const session = buildAuthSessionSnapshot({
        userId: "user-external",
        email: "person@example.com",
        roles: [role],
        studentProfileId: null,
        alumniProfileId: role === ROLES.ALUMNI ? "alumni-profile" : null,
        industryPartnerProfileId: role === ROLES.INDUSTRY_PARTNER ? "partner-profile" : null,
        alumniVerificationStatus: role === ROLES.ALUMNI ? "APPROVED" : null,
        authMethod: "password",
      });

      expect(session.profileGate).toEqual({ status: "COMPLETE" });
    }
  );

  it.each([ROLES.ALUMNI, ROLES.INDUSTRY_PARTNER])(
    "refuses recovery workspace access for external role %s",
    (role) => {
      const session = buildAuthSessionSnapshot({
        userId: "user-recovering",
        email: "person@example.com",
        roles: [role],
        studentProfileId: null,
        alumniProfileId: role === ROLES.ALUMNI ? "alumni-profile" : null,
        industryPartnerProfileId: role === ROLES.INDUSTRY_PARTNER ? "partner-profile" : null,
        alumniVerificationStatus: "APPROVED",
        industryPartnerVerificationStatus: "APPROVED",
        authMethod: "recovery",
      });

      expect(session.profileGate).toEqual({ status: "AUTH_METHOD_MISMATCH", role });
    }
  );

  it("refuses an internal role when the method could not be proved", () => {
    // A null method grants no internal role: the gate cannot distinguish a
    // forged or absent claim, so the boundary fails closed.
    const session = buildAuthSessionSnapshot({
      userId: "user-unproved",
      email: "person@acd.edu.ph",
      roles: [ROLES.SECRETARY],
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      authMethod: null,
    });

    expect(session.profileGate).toEqual({
      status: "AUTH_METHOD_MISMATCH",
      role: ROLES.SECRETARY,
    });
    expect(session.authMethod).toBeNull();
  });
});
