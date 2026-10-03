import { EntryShell, ResetPasswordForm } from "@/features/entry";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Reset Password"),
  description: "Set a new password with a recovery code",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const emailParam = resolvedSearchParams?.email;
  const prefilledEmail = typeof emailParam === "string" ? emailParam : undefined;

  return (
    <EntryShell
      title="Set a new password"
      description="Enter your recovery code and choose a new password. Recovery only changes the password — it never opens a workspace."
    >
      <ResetPasswordForm prefilledEmail={prefilledEmail} />
    </EntryShell>
  );
}
