import { EntryShell, VerifyEmailForm } from "@/features/entry";
import { requireLegalAcknowledgement } from "@/features/legal/services/require-legal-acknowledgement";
import {
  PENDING_VERIFICATION_NOTICE,
  readPendingVerificationEmail,
} from "@/features/entry/services/pending-verification-email";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Verify Email"),
  description: "Confirm inbox control with a 6-digit verification code",
};

/**
 * Reads the two facts the code step needs before it can render honestly: which
 * address registration pinned for this browser, and whether that browser still
 * holds a valid acknowledgement ticket. The email search parameter is honored
 * only as a prefill for a cold visit — a pinned address is the one the person
 * actually registered with and always wins.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [resolvedSearchParams, pendingEmail, legal] = await Promise.all([
    searchParams,
    readPendingVerificationEmail(),
    requireLegalAcknowledgement("external"),
  ]);

  const emailParam = resolvedSearchParams?.email;
  const fallbackEmail = typeof emailParam === "string" ? emailParam : undefined;

  return (
    <EntryShell
      title="Verify your email"
      description="Enter the 6-digit code we sent to your inbox. This confirms inbox control only."
    >
      <VerifyEmailForm
        email={pendingEmail ?? fallbackEmail}
        emailLocked={pendingEmail !== null}
        legalAcknowledged={legal.acknowledged}
        initialMessage={pendingEmail ? { kind: "info", text: PENDING_VERIFICATION_NOTICE } : null}
      />
    </EntryShell>
  );
}
