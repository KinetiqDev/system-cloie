import type { ReactNode } from "react";
import { ROLES } from "@/lib/constants/roles";
import { SessionGuard } from "@/features/auth/components/session-guard";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { VerificationStatusBanner } from "@/features/auth/components/verification-status-banner";

export default async function AlumniLayout({ children }: { children: ReactNode }) {
  const session = await resolveAuthSession();
  const verificationStatus = session?.alumniVerificationStatus ?? null;

  return (
    <SessionGuard allowedRoles={[ROLES.ALUMNI]}>
      {verificationStatus && <VerificationStatusBanner status={verificationStatus} />}
      {children}
    </SessionGuard>
  );
}
