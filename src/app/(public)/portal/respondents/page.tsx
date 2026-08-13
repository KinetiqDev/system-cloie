import { redirect } from "next/navigation";
import { PortalShell } from "@/features/portals";
import { ROLE_CARDS_RESPONDENT } from "@/features/portals/lib/role-card-config";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";

export const metadata = {
  title: "Respondent Portal | System CLOIE",
  description: "Sign in as a Student, Alumni, or Industry Partner",
};

export default async function RespondentPortalPage() {
  const session = await resolveAuthSession();

  if (session) {
    redirect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: "intent" in session.profileGate ? session.profileGate.intent : null,
        activeRole: session.activeRole,
        profileGate: session.profileGate,
      })
    );
  }

  return (
    <PortalShell
      title="Welcome to System CLOIE"
      subtitle="Select your role to access your personalized dashboard and tools."
      cards={ROLE_CARDS_RESPONDENT}
      session={null}
      backLink={{
        label: "Back to portal selection",
        href: "/",
      }}
      crossLink={{
        label: "ACD Staff or Faculty? Go to Staff Portal",
        href: "/portal/staff",
      }}
    />
  );
}
