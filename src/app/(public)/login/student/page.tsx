import { redirect } from "next/navigation";
import { EntryShell, GoogleEntryButton } from "@/features/entry";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { buildPageTitle } from "@/lib/page-title";
import Link from "next/link";

export const metadata = {
  title: buildPageTitle("Student Sign In"),
  description: "Student sign-in for System CLOIE with an ACD Google account",
};

export default async function StudentLoginPage() {
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
      title="Student sign in"
      description="Use your ACD Google account to open your Student workspace and answer evaluations."
      footer={
        <p className="text-body-sm text-muted-foreground">
          Not a Student?{" "}
          <Link
            href="/"
            className="text-primary hover:text-primary-hover font-medium underline-offset-4 hover:underline"
          >
            Choose another entrance
          </Link>
        </p>
      }
    >
      <GoogleEntryButton
        intent="student"
        roleTitle="Student"
        label="Continue with ACD Google"
        domainNote="ACD email required (@acd.edu.ph or @acdeducation.com). Student accounts are provisioned by the Secretary's office — there is no self-service placement form."
      />
      <div className="bg-muted/50 border-border text-body-sm text-muted-foreground rounded-lg border p-4 leading-relaxed">
        If your account is not set up yet, you will see a not-yet-set-up explanation with Secretary
        support guidance. Do not use Faculty registration — it cannot create a Student account.
      </div>
    </EntryShell>
  );
}
