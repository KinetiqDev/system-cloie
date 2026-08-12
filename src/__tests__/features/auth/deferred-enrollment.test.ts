import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { resolveProfileGate } from "@/features/users/services/resolve-profile-gate";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { deferredStudentProfileSchema, studentProfileSchema } from "@/lib/schemas/student-profile";

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

  it("returns STUDENT_ONBOARDING_REQUIRED when student has no profile (regardless of enrollment flag)", () => {
    const result = resolveProfileGate({
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      hasActiveEnrollment: false,
    });
    expect(result).toEqual({ status: "STUDENT_ONBOARDING_REQUIRED", intent: "student" });
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

// ---------------------------------------------------------------------------
// Schema selection — deferredStudentProfileSchema allows missing year_level/section
// ---------------------------------------------------------------------------
describe("deferredStudentProfileSchema", () => {
  const base = {
    program_id: "550e8400-e29b-41d4-a716-446655440000",
    student_id_number: "1000571225",
  };

  it("parses successfully when year_level and section are omitted", () => {
    const result = deferredStudentProfileSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("parses successfully when year_level and section are empty strings", () => {
    const result = deferredStudentProfileSchema.safeParse({
      ...base,
      year_level: "",
      section: "",
    });
    expect(result.success).toBe(true);
  });

  it("strips injected identity fields from successful parse output", () => {
    const result = deferredStudentProfileSchema.safeParse({
      ...base,
      first_name: "Injected",
      last_name: "Identity",
      name: "Injected Identity",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("first_name");
      expect(result.data).not.toHaveProperty("last_name");
      expect(result.data).not.toHaveProperty("name");
    }
  });

  it("fails when student_id_number is too short", () => {
    const result = deferredStudentProfileSchema.safeParse({ ...base, student_id_number: "123" });
    expect(result.success).toBe(false);
  });

  it("fails when program_id is not a UUID", () => {
    const result = deferredStudentProfileSchema.safeParse({ ...base, program_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// studentProfileSchema (full) — year_level and section are required
// ---------------------------------------------------------------------------
describe("studentProfileSchema — year_level and section required", () => {
  const base = {
    program_id: "550e8400-e29b-41d4-a716-446655440000",
    student_id_number: "1000571225",
    year_level: "FIRST_YEAR",
    section: "MORNING",
  };

  it("parses successfully with all fields", () => {
    const result = studentProfileSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("fails when year_level is missing", () => {
    const rest = {
      program_id: base.program_id,
      student_id_number: base.student_id_number,
      section: base.section,
    };
    const result = studentProfileSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("fails when section is missing", () => {
    const rest = {
      program_id: base.program_id,
      student_id_number: base.student_id_number,
      year_level: base.year_level,
    };
    const result = studentProfileSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
