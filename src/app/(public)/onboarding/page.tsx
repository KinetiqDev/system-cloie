import { redirect } from "next/navigation";
import Link from "next/link";
import { UserPlus, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { YearLevel } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resolveAuthSessionFromUser } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { createClient } from "@/lib/supabase/server";
import { StudentProfileForm } from "./student-profile-form";
import { AlumniOnboardingForm } from "@/features/users/components/alumni-onboarding-form";
import { IndustryPartnerOnboardingForm } from "@/features/users/components/industry-partner-onboarding-form";
import { FacultyOnboardingForm } from "@/features/users/components/faculty-onboarding-form";
import { resetIncompleteRoleClaim } from "@/lib/actions/onboarding-actions";
import { getActiveTermId } from "@/features/academic-calendar/services/resolve-active-term";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/portal/respondents");
  }

  const session = await resolveAuthSessionFromUser({
    id: user.id,
    email: user.email ?? null,
  });
  if (session && session.profileGate.status === "COMPLETE") {
    redirect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: null,
        activeRole: session.activeRole,
        profileGate: session.profileGate,
      })
    );
  }

  const resolvedParams = await searchParams;
  const intent = resolvedParams?.intent as string | undefined;
  const step = resolvedParams?.step as string | undefined;

  const programs = await prisma.program.findMany({
    where: { is_active: true },
    include: { majors: true },
    orderBy: { code: "asc" },
  });

  if (intent === "faculty") {
    return (
      <div className="mx-auto w-full max-w-2xl py-8">
        <FacultyOnboardingForm email={user.email!} name={session?.name ?? ""} programs={programs} />
      </div>
    );
  }

  if (intent === "alumni") {
    return (
      <div className="mx-auto w-full max-w-2xl py-8">
        <AlumniOnboardingForm email={user.email!} name={session?.name ?? ""} programs={programs} />
      </div>
    );
  }

  if (intent === "industry-partner") {
    return (
      <div className="mx-auto w-full max-w-2xl py-8">
        <IndustryPartnerOnboardingForm
          email={user.email!}
          name={session?.name ?? ""}
          programs={programs}
        />
      </div>
    );
  }

  if (intent === "student" && step === "form") {
    const yearLevels = Object.values(YearLevel);
    const activeTermId = await getActiveTermId();
    const hasActiveTerm = !!activeTermId;

    return (
      <div className="mx-auto w-full max-w-2xl py-8">
        <StudentProfileForm
          email={user.email!}
          name={session?.name ?? ""}
          programs={programs}
          yearLevels={yearLevels}
          hasActiveTerm={hasActiveTerm}
        />
      </div>
    );
  }

  if (intent === "student") {
    return (
      <div className="mx-auto w-full max-w-lg">
        <Card className="border-border overflow-hidden shadow-sm">
          <div className="bg-primary flex items-center justify-center py-10">
            <div className="bg-on-primary/20 flex size-16 items-center justify-center rounded-2xl">
              <UserPlus className="text-on-primary size-8" />
            </div>
          </div>

          <CardContent className="space-y-6 px-8 py-8">
            <h1 className="font-heading text-primary text-heading-lg text-center font-bold">
              Complete Your Student Profile
            </h1>

            <div className="border-warning bg-warning-soft/30 flex gap-3 rounded-lg border-l-4 p-4">
              <CheckCircle className="text-warning mt-0.5 size-5 shrink-0" />
              <p className="text-body-sm text-muted-foreground">
                We found your ACD account, but your student profile is not yet set up. Please
                complete your registration to access the platform.
              </p>
            </div>

            <Button
              render={<Link href="?intent=student&step=form" />}
              className="w-full gap-2 py-6 text-base font-semibold"
            >
              Continue Setup
              <ArrowRight className="size-5" />
            </Button>

            <form action={resetIncompleteRoleClaim} className="flex w-full justify-center">
              <Button
                type="submit"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground min-h-11 w-full gap-2"
              >
                <ArrowLeft className="size-4" />
                Cancel / Back to Role Selection
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  redirect("/onboarding?intent=student");
}
