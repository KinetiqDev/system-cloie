import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { resolveProfileGate } from "@/features/users/services/resolve-profile-gate";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";

// ---------------------------------------------------------------------------
// resolveProfileGate — DEFERRED_ENROLLMENT
// ---------------------------------------------------------------------------
describe("resolveProfileGate — deferred enrollment", () => {
  it("returns DEFERRED_ENROLLMENT when student has profile but hasActiveEnrollment is false", () => {
    const result = resolveProfileGate({
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      studentProfileId: "profile-uuid",
      alumniProfileId: null,
      industryPartnerProfileId: null,
      hasActiveEnrollment: false,
    });
    expect(result).toEqual({ status: "DEFERRED_ENROLLMENT" });
  });

  it("returns COMPLETE when student has profile and hasActiveEnrollment is true", () => {
    const result = resolveProfileGate({
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      studentProfileId: "profile-uuid",
      alumniProfileId: null,
      industryPartnerProfileId: null,
      hasActiveEnrollment: true,
    });
    expect(result).toEqual({ status: "COMPLETE" });
  });

  it("returns STUDENT_PLACEMENT_REQUIRED when student has no profile (regardless of enrollment flag)", () => {
    const result = resolveProfileGate({
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      hasActiveEnrollment: false,
    });
    expect(result).toEqual({ status: "STUDENT_PLACEMENT_REQUIRED" });
  });
});

// ---------------------------------------------------------------------------
// resolvePostLoginDestination — DEFERRED_ENROLLMENT routing
// ---------------------------------------------------------------------------
describe("resolvePostLoginDestination — DEFERRED_ENROLLMENT routes to /student/dashboard", () => {
  it("routes DEFERRED_ENROLLMENT to /student/dashboard", () => {
    const destination = resolvePostLoginDestination({
      requestedPath: "/portal/respondents",
      intent: null,
      activeRole: ROLES.STUDENT,
      profileGate: { status: "DEFERRED_ENROLLMENT" },
    });
    expect(destination).toBe("/student/dashboard");
  });
});
