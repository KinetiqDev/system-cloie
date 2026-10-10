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
      backLink={{ href: "/entry/staff", label: "Staff & Faculty" }}
      title="Staff sign in"
      description="Use your ACD Google account to open your assigned workspace."
      footer={
        <p className="text-body-sm text-muted-foreground">
          New Faculty member?{" "}
          <Link
            href="/register/faculty"
            className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
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
        domainNote="Use your @acd.edu.ph or @acdeducation.com account."
      />
      <p className="text-body-sm text-muted-foreground leading-relaxed">
        Secretary, Dean, Program Head, Faculty, and General Education Coordinator sign in here. If
        you have more than one role, choose a workspace after sign-in.
      </p>
    </EntryShell>
  );
}
