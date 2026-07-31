import type { Role } from "@/lib/constants/roles";
import type { VerificationStatus } from "@prisma/client";
import { resolveProfileGate } from "@/features/users/services/resolve-profile-gate";

export type AuthSessionSnapshot = {
  userId: string;
  email: string | null;
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
  roles: Role[];
  studentProfileId: string | null;
  alumniProfileId?: string | null;
  industryPartnerProfileId?: string | null;
  isActive?: boolean;
  alumniVerificationStatus?: VerificationStatus | null;
  industryPartnerVerificationStatus?: VerificationStatus | null;
  hasActiveEnrollment?: boolean;
  hasFacultyAffiliation?: boolean;
  isDemoUser?: boolean;
  isDedicatedDemo?: boolean;
}): AuthSessionSnapshot {
  const activeRole = input.roles[0] ?? null;

  return {
    userId: input.userId,
    email: input.email,
    roles: input.roles,
    activeRole,
    studentProfileId: input.studentProfileId,
    alumniProfileId: input.alumniProfileId ?? null,
    industryPartnerProfileId: input.industryPartnerProfileId ?? null,
    alumniVerificationStatus: input.alumniVerificationStatus ?? null,
    industryPartnerVerificationStatus: input.industryPartnerVerificationStatus ?? null,
    profileGate:
      input.isDemoUser && !input.isDedicatedDemo
        ? { status: "COMPLETE" }
        : resolveProfileGate({
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
