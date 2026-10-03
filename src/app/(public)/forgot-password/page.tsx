import { EntryShell, ForgotPasswordForm } from "@/features/entry";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Forgot Password"),
  description: "Request a password recovery code",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const emailParam = resolvedSearchParams?.email;
  const prefilledEmail = typeof emailParam === "string" ? emailParam : undefined;

  return (
    <EntryShell
      title="Forgot your password?"
      description="Enter your account email. If it is eligible, a 6-digit recovery code is on its way."
    >
      <ForgotPasswordForm prefilledEmail={prefilledEmail} />
    </EntryShell>
  );
}
