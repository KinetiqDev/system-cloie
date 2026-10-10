import { redirect } from "next/navigation";
import { EntryShell, ExternalEmailForm } from "@/features/entry";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Alumni & Partner Sign In"),
  description: "Email-first sign-in for Alumni and Industry Partners",
};

export default async function ExternalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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

  const resolvedSearchParams = await searchParams;
  const emailParam = resolvedSearchParams?.email;
  const prefilledEmail = typeof emailParam === "string" ? emailParam : undefined;

  return (
    <EntryShell
      backLink={{ href: "/entry/external", label: "Alumni & Industry Partners" }}
      title="Alumni & partner sign in"
      description="Sign in with your email and password, or choose Google."
    >
      <ExternalEmailForm prefilledEmail={prefilledEmail} />
    </EntryShell>
  );
}
