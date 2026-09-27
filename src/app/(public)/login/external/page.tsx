import Link from "next/link";
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
      title="Alumni & partner sign in"
      description="Start with your email address, then sign in with a password or continue with Google."
      footer={
        <p className="text-body-sm text-muted-foreground">
          Internal ACD member?{" "}
          <Link
            href="/login/staff"
            className="text-primary hover:text-primary-hover font-medium underline-offset-4 hover:underline"
          >
            Use staff sign-in
          </Link>
        </p>
      }
    >
      <ExternalEmailForm prefilledEmail={prefilledEmail} />
    </EntryShell>
  );
}
