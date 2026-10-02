import { FacultyApprovalStatus } from "@prisma/client";
import { ROLES, type Role } from "@/lib/constants/roles";
import type { AuthMethod } from "@/features/auth/services/resolve-auth-method";

export type ProfileGate =
  | { status: "ROLE_SELECTION_REQUIRED" }
  | { status: "STUDENT_PLACEMENT_REQUIRED" }
  | { status: "FACULTY_ONBOARDING_REQUIRED"; intent: "faculty" }
  | { status: "FACULTY_APPROVAL_PENDING" }
  | { status: "FACULTY_REQUEST_REJECTED" }
  | { status: "ALUMNI_ONBOARDING_REQUIRED"; intent: "alumni" }
  | { status: "INDUSTRY_PARTNER_ONBOARDING_REQUIRED"; intent: "industry-partner" }
  | { status: "INACTIVE" }
  | { status: "REJECTED_EXTERNAL_ACCOUNT" }
  | { status: "DEFERRED_ENROLLMENT" }
  | { status: "AUTH_METHOD_MISMATCH"; role: Role }
  | { status: "COMPLETE" };

/**
 * Roles that may only be used from a current Google sign-in. A password,
 * one-time-code, or recovery session for the same Auth identity fails closed
 * for these roles at the centralized session boundary (issue #649); external
 * roles may use either method.
 */
export const GOOGLE_ONLY_ROLES: readonly Role[] = [
  ROLES.STUDENT,
  ROLES.FACULTY,
  ROLES.SECRETARY,
  ROLES.DEAN,
  ROLES.PROGRAM_HEAD,
  ROLES.GEN_ED_COORDINATOR,
] as const;

type ProfileGateInput = {
  roles: Role[];
  activeRole: Role | null;
  studentProfileId: string | null;
  alumniProfileId: string | null;
  industryPartnerProfileId: string | null;
  isActive?: boolean;
  alumniVerificationStatus?: string | null;
  industryPartnerVerificationStatus?: string | null;
  hasActiveEnrollment?: boolean;
  hasFacultyAffiliation?: boolean;
  /** Role-scoped Faculty self-request review state; never global deactivation. */
  facultyApprovalStatus?: FacultyApprovalStatus | null;
  /** Tri-state: absent = not the session boundary; "google" = proved; other/null = refuse. */
  authMethod?: AuthMethod | null;
};

/** Credential methods any role may use; internal roles still require Google. */
const PERMITTED_METHODS: readonly AuthMethod[] = ["google", "password", "verified-signup"] as const;

/**
 * Method enforcement precedes every role gate. `authMethod` is tri-state on
 * purpose: absent means this call is not the session boundary and the boundary
 * has already judged the method; a proved non-Google method and an
 * evaluated-but-unproved one (null) both fail closed, so a forged or absent
 * `amr` claim can never open an internal workspace.
 */
function resolveMethodGate(input: ProfileGateInput, role: Role): ProfileGate | null {
  const method = input.authMethod;
  if (method === undefined) return null;
  if (method === null || !PERMITTED_METHODS.includes(method)) {
    return { status: "AUTH_METHOD_MISMATCH", role };
  }
  if (GOOGLE_ONLY_ROLES.includes(role) && method !== "google") {
    return { status: "AUTH_METHOD_MISMATCH", role };
  }
  return null;
}

export function resolveProfileGate(input: ProfileGateInput): ProfileGate {
  if (input.isActive === false) {
    return { status: "INACTIVE" };
  }

  if (!input.activeRole) {
    return { status: "ROLE_SELECTION_REQUIRED" };
  }

  const role = input.activeRole;
  const methodGate = resolveMethodGate(input, role);
  if (methodGate) return methodGate;

  switch (role) {
    case ROLES.FACULTY:
      return resolveFacultyGate(input);
    case ROLES.INDUSTRY_PARTNER:
      return resolveIndustryPartnerGate(input);
    case ROLES.ALUMNI:
      return resolveAlumniGate(input);
    case ROLES.STUDENT:
      return resolveStudentGate(input);
    default:
      return { status: "COMPLETE" };
  }
}

function resolveFacultyGate(input: ProfileGateInput): ProfileGate {
  if (input.facultyApprovalStatus === "REJECTED") {
    return { status: "FACULTY_REQUEST_REJECTED" };
  }
  if (input.facultyApprovalStatus === "PENDING") {
    return { status: "FACULTY_APPROVAL_PENDING" };
  }
  if (!input.hasFacultyAffiliation) {
    return { status: "FACULTY_ONBOARDING_REQUIRED", intent: "faculty" };
  }
  return { status: "COMPLETE" };
}

function resolveIndustryPartnerGate(input: ProfileGateInput): ProfileGate {
  if (!input.industryPartnerProfileId) {
    return { status: "INDUSTRY_PARTNER_ONBOARDING_REQUIRED", intent: "industry-partner" };
  }
  if (input.industryPartnerVerificationStatus === "REJECTED") {
    return { status: "REJECTED_EXTERNAL_ACCOUNT" };
  }
  return { status: "COMPLETE" };
}

function resolveAlumniGate(input: ProfileGateInput): ProfileGate {
  if (!input.alumniProfileId) {
    return { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" };
  }
  if (input.alumniVerificationStatus === "REJECTED") {
    return { status: "REJECTED_EXTERNAL_ACCOUNT" };
  }
  return { status: "COMPLETE" };
}

function resolveStudentGate(input: ProfileGateInput): ProfileGate {
  // Student placement is institution-recorded (issue #649): program, major,
  // year level, section, and term enrollment are written only by the
  // Secretary's office. A provisioned Student with no academic context is
  // therefore never offered a self-service form — the account waits for the
  // institution to record its placement.
  if (!input.studentProfileId) {
    return { status: "STUDENT_PLACEMENT_REQUIRED" };
  }
  if (input.hasActiveEnrollment === false) {
    return { status: "DEFERRED_ENROLLMENT" };
  }
  return { status: "COMPLETE" };
}
