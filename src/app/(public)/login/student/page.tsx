import { redirect } from "next/navigation";
import { EntryShell, GoogleEntryButton } from "@/features/entry";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { buildPageTitle } from "@/lib/page-title";

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
      backLink={{ href: "/entry/student", label: "Students" }}
      title="Student sign in"
      description="Answer course evaluations with your ACD Google account."
    >
      <GoogleEntryButton
        intent="student"
        roleTitle="Student"
        label="Continue with ACD Google"
        domainNote="Use your @acd.edu.ph or @acdeducation.com account."
      />
      <p className="text-body-sm text-muted-foreground leading-relaxed">
        New student? The Secretary&apos;s office sets up your account. If sign-in does not work,
        contact them for help.
      </p>
    </EntryShell>
  );
}
