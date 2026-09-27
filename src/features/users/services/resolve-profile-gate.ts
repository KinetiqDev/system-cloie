import { FacultyApprovalStatus } from "@prisma/client";
import { ROLES, type Role } from "@/lib/constants/roles";
import type { AuthMethod } from "@/features/auth/services/resolve-auth-method";

export type ProfileGate =
  | { status: "ROLE_SELECTION_REQUIRED" }
  | { status: "STUDENT_ONBOARDING_REQUIRED"; intent: "student" }
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

export type ProfileGateInput = {
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

export function resolveProfileGate(input: ProfileGateInput): ProfileGate {
  if (input.isActive === false) {
    return { status: "INACTIVE" };
  }

  if (!input.activeRole) {
    return { status: "ROLE_SELECTION_REQUIRED" };
  }

  const role = input.activeRole;

  // Method enforcement precedes every role gate. `authMethod` is tri-state on
  // purpose: absent means this call is not the session boundary and the
  // boundary has already judged the method; a proved non-Google method and an
  // evaluated-but-unproved one (null) both fail closed, so a forged or absent
  // `amr` claim can never open an internal workspace.
  if (
    GOOGLE_ONLY_ROLES.includes(role) &&
    input.authMethod !== undefined &&
    input.authMethod !== "google"
  ) {
    return { status: "AUTH_METHOD_MISMATCH", role };
  }

  if (role === ROLES.FACULTY) {
    if (input.facultyApprovalStatus === "REJECTED") {
      return { status: "FACULTY_REQUEST_REJECTED" };
    }
    if (input.facultyApprovalStatus === "PENDING") {
      return { status: "FACULTY_APPROVAL_PENDING" };
    }
    if (!input.hasFacultyAffiliation) {
      return { status: "FACULTY_ONBOARDING_REQUIRED", intent: "faculty" };
    }
  }

  if (role === ROLES.INDUSTRY_PARTNER) {
    if (!input.industryPartnerProfileId) {
      return { status: "INDUSTRY_PARTNER_ONBOARDING_REQUIRED", intent: "industry-partner" };
    }
    if (input.industryPartnerVerificationStatus === "REJECTED") {
      return { status: "REJECTED_EXTERNAL_ACCOUNT" };
    }
  }

  if (role === ROLES.ALUMNI) {
    if (!input.alumniProfileId) {
      return { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" };
    }
    if (input.alumniVerificationStatus === "REJECTED") {
      return { status: "REJECTED_EXTERNAL_ACCOUNT" };
    }
  }

  if (role === ROLES.STUDENT) {
    if (!input.studentProfileId) {
      return { status: "STUDENT_ONBOARDING_REQUIRED", intent: "student" };
    }
    if (input.hasActiveEnrollment === false) {
      return { status: "DEFERRED_ENROLLMENT" };
    }
  }

  return { status: "COMPLETE" };
}
