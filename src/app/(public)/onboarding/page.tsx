import { redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { prisma } from "@/lib/db/prisma";
import { AlumniOnboardingForm } from "@/features/users/components/alumni-onboarding-form";
import { IndustryPartnerOnboardingForm } from "@/features/users/components/industry-partner-onboarding-form";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Complete Your Profile") };

type OnboardingSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: OnboardingSearchParams;
}) {
  // One centralized, claim-verified session boundary: this page never reads the
  // raw Supabase user, so an unproved access token cannot reach a form.
  const session = await resolveAuthSession();
  if (!session) {
    redirect("/");
  }

  const gate = session.profileGate;

  // This page holds the external onboarding forms only. Every other verdict —
  // inactive, method-refused, rejected, pending Faculty review,
  // awaiting-role-selection, awaiting-placement, or already complete — and
  // every intent that is not the session's own external gate resolves to the
  // destination that verdict names, so no form is reachable by an unrelated
  // session or a hand-edited query string (issue #649).
  const resolvedParams = await searchParams;
  const requestedIntent = typeof resolvedParams?.intent === "string" ? resolvedParams.intent : "";
  const gateIntent = "intent" in gate ? gate.intent : null;
  const externalOnboardingGate =
    gateIntent === "alumni" || gateIntent === "industry-partner" ? gateIntent : null;

  if (!externalOnboardingGate || externalOnboardingGate !== requestedIntent) {
    redirect(
      resolvePostLoginDestination({
        requestedPath: null,
        intent: gateIntent,
        activeRole: session.activeRole,
        profileGate: gate,
      })
    );
  }

  const programs = await prisma.program.findMany({
    where: { is_active: true },
    include: { majors: true },
    orderBy: { code: "asc" },
  });

  const identity = {
    email: session.email ?? "",
    name: session.name ?? "",
  };

  // The gate above proved the requested intent is this session's own external
  // onboarding step, so exactly one form is reachable here. No Student
  // placement form exists: placement is institution-recorded (issue #649).
  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      {externalOnboardingGate === "alumni" ? (
        <AlumniOnboardingForm {...identity} programs={programs} />
      ) : (
        <IndustryPartnerOnboardingForm {...identity} programs={programs} />
      )}
    </div>
  );
}
