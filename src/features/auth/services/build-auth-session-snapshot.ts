import type { Role } from "@/lib/constants/roles";
import type { FacultyApprovalStatus, VerificationStatus } from "@prisma/client";
import {
  resolveProfileGate,
  type ProfileGate,
} from "@/features/users/services/resolve-profile-gate";
import type { AuthMethod } from "./resolve-auth-method";

export type AuthSessionSnapshot = {
  userId: string;
  email: string | null;
  /** Canonical domain User.name; never email-derived or invented. */
  name: string | null;
  roles: Role[];
  activeRole: Role | null;
  studentProfileId: string | null;
  alumniProfileId: string | null;
  industryPartnerProfileId: string | null;
  alumniVerificationStatus: VerificationStatus | null;
  industryPartnerVerificationStatus: VerificationStatus | null;
  /** Role-scoped Faculty review state; null for a Secretary-provisioned Faculty. */
  facultyApprovalStatus: FacultyApprovalStatus | null;
  /** Sign-in method proved for this session; null when it could not be proved. */
  authMethod: AuthMethod | null;
  profileGate: ProfileGate;
};

export function buildAuthSessionSnapshot(input: {
  userId: string;
  email: string | null;
  name?: string | null;
  roles: Role[];
  activeRole?: Role | null;
  studentProfileId: string | null;
  alumniProfileId?: string | null;
  industryPartnerProfileId?: string | null;
  isActive?: boolean;
  alumniVerificationStatus?: VerificationStatus | null;
  industryPartnerVerificationStatus?: VerificationStatus | null;
  hasActiveEnrollment?: boolean;
  hasFacultyAffiliation?: boolean;
  facultyApprovalStatus?: FacultyApprovalStatus | null;
  authMethod?: AuthMethod | null;
}): AuthSessionSnapshot {
  // A multi-role account never inherits an unrequested role: the single-role
  // fallback applies only when exactly one role is assigned, and every other
  // case stays explicitly null so /select-role performs a deliberate choice
  // (issue #649, ADR 0022).
  const activeRole = input.activeRole ?? (input.roles.length === 1 ? input.roles[0] : null);
  const name = typeof input.name === "string" && input.name.trim().length > 0 ? input.name : null;
  const facultyApprovalStatus = input.facultyApprovalStatus ?? null;
  const authMethod = input.authMethod ?? null;

  return {
    userId: input.userId,
    email: input.email,
    name,
    roles: input.roles,
    activeRole,
    studentProfileId: input.studentProfileId,
    alumniProfileId: input.alumniProfileId ?? null,
    industryPartnerProfileId: input.industryPartnerProfileId ?? null,
    alumniVerificationStatus: input.alumniVerificationStatus ?? null,
    industryPartnerVerificationStatus: input.industryPartnerVerificationStatus ?? null,
    facultyApprovalStatus,
    authMethod,
    profileGate: resolveProfileGate({
      roles: input.roles,
      activeRole,
      studentProfileId: input.studentProfileId,
      alumniProfileId: input.alumniProfileId ?? null,
      industryPartnerProfileId: input.industryPartnerProfileId ?? null,
      isActive: input.isActive,
      alumniVerificationStatus: input.alumniVerificationStatus,
      industryPartnerVerificationStatus: input.industryPartnerVerificationStatus,
      hasActiveEnrollment: input.hasActiveEnrollment,
      hasFacultyAffiliation: input.hasFacultyAffiliation,
      facultyApprovalStatus,
      // Pass the tri-state through unchanged: a snapshot built off the session
      // boundary always supplies a proved or explicitly-unproved method, and
      // only a caller that never evaluated the method leaves it absent.
      authMethod: input.authMethod,
    }),
  };
}
