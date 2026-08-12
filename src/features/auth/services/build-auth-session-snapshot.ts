import type { Role } from "@/lib/constants/roles";
import type { VerificationStatus } from "@prisma/client";
import { resolveProfileGate } from "@/features/users/services/resolve-profile-gate";

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
  profileGate: ReturnType<typeof resolveProfileGate>;
};

export function buildAuthSessionSnapshot(input: {
  userId: string;
  email: string | null;
  name?: string | null;
  roles: Role[];
  studentProfileId: string | null;
  alumniProfileId?: string | null;
  industryPartnerProfileId?: string | null;
  isActive?: boolean;
  alumniVerificationStatus?: VerificationStatus | null;
  industryPartnerVerificationStatus?: VerificationStatus | null;
  hasActiveEnrollment?: boolean;
  hasFacultyAffiliation?: boolean;
}): AuthSessionSnapshot {
  const activeRole = input.roles[0] ?? null;
  const name = typeof input.name === "string" && input.name.trim().length > 0 ? input.name : null;

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
    }),
  };
}
