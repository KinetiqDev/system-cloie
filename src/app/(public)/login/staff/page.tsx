import { redirect } from "next/navigation";
import Link from "next/link";
import { EntryShell, GoogleEntryButton } from "@/features/entry";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Staff Sign In"),
  description: "One staff sign-in for every internal System CLOIE role",
};

export default async function StaffLoginPage() {
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
      title="Staff sign in"
      description="One sign-in for Secretary, Dean, Program Head, General Education Coordinator, and Faculty."
      footer={
        <p className="text-body-sm text-muted-foreground">
          New Faculty member?{" "}
          <Link
            href="/register/faculty"
            className="text-primary hover:text-primary-hover font-medium underline-offset-4 hover:underline"
          >
            Submit a Faculty request
          </Link>
        </p>
      }
    >
      <GoogleEntryButton
        intent="staff"
        roleTitle="Staff or Faculty"
        label="Continue with ACD Google"
        domainNote="ACD email required (@acd.edu.ph or @acdeducation.com). Your assigned roles decide which workspaces open — sign-in never invents authority."
      />
      <div className="bg-muted/50 border-border text-body-sm text-muted-foreground rounded-lg border p-4 leading-relaxed">
        One account can hold several roles — for example Program Head and Faculty. After sign-in you
        choose which workspace to continue with, and you can switch again at any time.
      </div>
    </EntryShell>
  );
}
