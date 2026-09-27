import { EntryShell, VerifyEmailForm } from "@/features/entry";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Verify Email"),
  description: "Confirm inbox control with a 6-digit verification code",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const emailParam = resolvedSearchParams?.email;
  const prefilledEmail = typeof emailParam === "string" ? emailParam : undefined;

  return (
    <EntryShell
      title="Verify your email"
      description="Enter the 6-digit code we sent to your inbox. This confirms inbox control only."
    >
      <VerifyEmailForm prefilledEmail={prefilledEmail} />
    </EntryShell>
  );
}
