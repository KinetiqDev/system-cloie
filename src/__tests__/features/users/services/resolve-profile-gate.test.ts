import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { resolveProfileGate } from "@/features/users/services/resolve-profile-gate";

describe("resolveProfileGate", () => {
  it("returns ROLE_SELECTION_REQUIRED when activeRole is null", () => {
    const result = resolveProfileGate({
      roles: [],
      activeRole: null,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
    });
    expect(result).toEqual({ status: "ROLE_SELECTION_REQUIRED" });
  });

  it("returns STUDENT_PLACEMENT_REQUIRED if user has STUDENT role but no profile", () => {
    const result = resolveProfileGate({
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
    });
    expect(result).toEqual({ status: "STUDENT_PLACEMENT_REQUIRED" });
  });

  it("returns ALUMNI_ONBOARDING_REQUIRED if user has ALUMNI role but no profile", () => {
    const result = resolveProfileGate({
      roles: [ROLES.ALUMNI],
      activeRole: ROLES.ALUMNI,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
    });
    expect(result).toEqual({ status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" });
  });

  it("returns INDUSTRY_PARTNER_ONBOARDING_REQUIRED if user has INDUSTRY_PARTNER role but no profile", () => {
    const result = resolveProfileGate({
      roles: [ROLES.INDUSTRY_PARTNER],
      activeRole: ROLES.INDUSTRY_PARTNER,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
    });
    expect(result).toEqual({
      status: "INDUSTRY_PARTNER_ONBOARDING_REQUIRED",
      intent: "industry-partner",
    });
  });

  it("returns COMPLETE if all roles have their profiles", () => {
    const result1 = resolveProfileGate({
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      studentProfileId: "student-prof-1",
      alumniProfileId: null,
      industryPartnerProfileId: null,
    });
    expect(result1).toEqual({ status: "COMPLETE" });

    const result2 = resolveProfileGate({
      roles: [ROLES.ALUMNI],
      activeRole: ROLES.ALUMNI,
      studentProfileId: null,
      alumniProfileId: "alumni-prof-1",
      industryPartnerProfileId: null,
    });
    expect(result2).toEqual({ status: "COMPLETE" });

    const result3 = resolveProfileGate({
      roles: [ROLES.INDUSTRY_PARTNER],
      activeRole: ROLES.INDUSTRY_PARTNER,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: "partner-prof-1",
    });
    expect(result3).toEqual({ status: "COMPLETE" });
  });

  it("returns INACTIVE when isActive is false", () => {
    const result = resolveProfileGate({
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      studentProfileId: "student-prof-1",
      alumniProfileId: null,
      industryPartnerProfileId: null,
      isActive: false,
    });
    expect(result).toEqual({ status: "INACTIVE" });
  });

  it("returns REJECTED_EXTERNAL_ACCOUNT when alumni verification status is REJECTED", () => {
    const result = resolveProfileGate({
      roles: [ROLES.ALUMNI],
      activeRole: ROLES.ALUMNI,
      studentProfileId: null,
      alumniProfileId: "alumni-prof-1",
      industryPartnerProfileId: null,
      alumniVerificationStatus: "REJECTED",
    });
    expect(result).toEqual({ status: "REJECTED_EXTERNAL_ACCOUNT" });
  });

  it("returns REJECTED_EXTERNAL_ACCOUNT when industry partner verification status is REJECTED", () => {
    const result = resolveProfileGate({
      roles: [ROLES.INDUSTRY_PARTNER],
      activeRole: ROLES.INDUSTRY_PARTNER,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: "partner-prof-1",
      industryPartnerVerificationStatus: "REJECTED",
    });
    expect(result).toEqual({ status: "REJECTED_EXTERNAL_ACCOUNT" });
  });

  it("returns DEFERRED_ENROLLMENT when student does not have active enrollment", () => {
    const result = resolveProfileGate({
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      studentProfileId: "student-prof-1",
      alumniProfileId: null,
      industryPartnerProfileId: null,
      hasActiveEnrollment: false,
    });
    expect(result).toEqual({ status: "DEFERRED_ENROLLMENT" });
  });

  it("returns FACULTY_ONBOARDING_REQUIRED if user has FACULTY role but no faculty affiliation", () => {
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

  it("returns COMPLETE if user has FACULTY role and has faculty affiliation", () => {
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
