import type { ReactNode } from "react";
import { ROLES } from "@/lib/constants/roles";
import { SessionGuard } from "@/features/auth/components/session-guard";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { VerificationStatusBanner } from "@/features/auth/components/verification-status-banner";

export default async function IndustryPartnerLayout({ children }: { children: ReactNode }) {
  const session = await resolveAuthSession();
  const verificationStatus = session?.industryPartnerVerificationStatus ?? null;

  return (
    <SessionGuard allowedRoles={[ROLES.INDUSTRY_PARTNER]}>
      {verificationStatus && <VerificationStatusBanner status={verificationStatus} />}
      {children}
    </SessionGuard>
  );
}
