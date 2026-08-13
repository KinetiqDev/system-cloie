import { redirect } from "next/navigation";
import { PortalShell } from "@/features/portals";
import { ROLE_CARDS_STAFF } from "@/features/portals/lib/role-card-config";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";

export const metadata = {
  title: "Staff & Faculty Portal | System CLOIE",
  description: "Sign in as ACD Staff or Faculty Member",
};

export default async function StaffPortalPage() {
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
      title="ACD Staff & Faculty Portal"
      subtitle="Select your role to manage and configure the system."
      cards={ROLE_CARDS_STAFF}
      session={null}
      backLink={{
        label: "Back to portal selection",
        href: "/",
      }}
      crossLink={{
        label: "Student, Alumni, or Partner? Go to Respondent Portal",
        href: "/portal/respondents",
      }}
    />
  );
}
