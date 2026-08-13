import type { Role } from "@/lib/constants/roles";
import type { AuthSessionSnapshot } from "@/features/auth/services/build-auth-session-snapshot";

export function createAuthSessionSnapshot(
  overrides: Partial<Omit<AuthSessionSnapshot, "activeRole">> & {
    userId?: string;
    roles?: Role[];
  } = {}
): AuthSessionSnapshot {
  const roles = overrides.roles ?? [];
  return {
    userId: overrides.userId ?? "user-1",
    email: overrides.email ?? null,
    name: overrides.name ?? null,
    roles,
    activeRole: roles[0] ?? null,
    studentProfileId: overrides.studentProfileId ?? null,
    alumniProfileId: overrides.alumniProfileId ?? null,
    industryPartnerProfileId: overrides.industryPartnerProfileId ?? null,
    alumniVerificationStatus: overrides.alumniVerificationStatus ?? null,
    industryPartnerVerificationStatus: overrides.industryPartnerVerificationStatus ?? null,
    profileGate: overrides.profileGate ?? { status: "COMPLETE" },
  };
}
