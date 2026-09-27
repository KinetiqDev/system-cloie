import { redirect } from "next/navigation";
import { EntryShell, ExternalRegisterForm } from "@/features/entry";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Alumni & Partner Registration"),
  description: "Create an Alumni or Industry Partner account",
};

export default async function ExternalRegisterPage() {
  const session = await resolveAuthSession();

  if (session && session.profileGate.status !== "ROLE_SELECTION_REQUIRED") {
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
    <EntryShell
      title="Create an external account"
      description="Choose Alumni or Industry Partner, then verify your inbox. Verification never implies institutional approval."
      footer={
        <p className="text-body-sm text-muted-foreground">
          Unverified accounts cannot open dashboards or answer evaluations.
        </p>
      }
    >
      <ExternalRegisterForm />
    </EntryShell>
  );
}
