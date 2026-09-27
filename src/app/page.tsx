import Image from "next/image";
import Link from "next/link";
import { Building2, CheckCircle2, GraduationCap, Users, XCircle } from "lucide-react";
import { PortalChoiceCard, InstallAppButton } from "@/features/portals";
import { EntryHelpFaq } from "@/features/entry";
import { AppearanceMenuTrigger } from "@/features/design-system/components/appearance-menu-trigger";
import { resolveAppearanceAvailability } from "@/features/design-system/services/resolve-appearance-availability";
import {
  DevRoleSwitcher,
  DevRoleSwitcherDesktop,
} from "@/features/auth/components/dev-role-switcher";

const IS_POINTS = [
  "College-wide Outcome-Based Education evaluation, monitoring, analytics, and reporting",
  "Stakeholder evaluations from students, alumni, and industry partners",
  "Traceable attainment evidence: every figure connects back to the responses that produced it",
  "Defensible evidence for quality assurance, accreditation, and continuous improvement",
];

const IS_NOT_POINTS = [
  "Not a learning management system — it does not deliver instruction",
  "Not a student information system — no grades, transcripts, or enrollment replacement",
  "No individual grade management of any kind",
  "No open comment boards — responses stay confidential within the evaluation process",
];

export default function Home() {
  const appearanceEnabled = resolveAppearanceAvailability();
  return (
    <div className="bg-background relative min-h-screen overflow-hidden">
      {/* Header */}
      <header className="border-border/80 bg-background/80 relative z-10 border-b backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Image
              src="/logos/cloie-logo.svg"
              alt="System CLOIE"
              width={442}
              height={500}
              className="border-border h-9 w-auto shrink-0 rounded border bg-white object-contain p-0.5"
            />
            <div className="space-y-0">
              <p className="text-title-md text-link font-bold">System CLOIE</p>
              <p className="text-caption text-muted-foreground">Assumption College of Davao</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AppearanceMenuTrigger enabled={appearanceEnabled} />
            <InstallAppButton />
            <DevRoleSwitcherDesktop />
            <DevRoleSwitcher />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section
          aria-labelledby="landing-hero-heading"
          className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-backwards mx-auto flex max-w-3xl flex-col items-center py-16 text-center motion-safe:duration-700 sm:py-24"
        >
          <div className="mx-auto mb-6 flex items-center justify-center gap-4 sm:gap-5">
            <div className="ring-primary/10 relative flex size-24 items-center justify-center rounded-full bg-white shadow-sm ring-4 sm:size-28">
              <Image
                src="/logos/acd-logo.png"
                alt="Assumption College of Davao"
                width={80}
                height={80}
                className="object-contain"
                priority
              />
            </div>
            <div className="ring-primary/10 relative flex size-24 items-center justify-center rounded-full bg-white shadow-sm ring-4 sm:size-28">
              <Image
                src="/logos/cloie-logo.svg"
                alt="System CLOIE"
                width={442}
                height={500}
                className="h-20 w-auto object-contain"
                priority
              />
            </div>
          </div>

          <h1
            id="landing-hero-heading"
            className="text-display-md text-foreground sm:text-display-lg font-extrabold tracking-tight"
          >
            Welcome to System CLOIE
          </h1>
          <p className="text-body-lg text-muted-foreground mx-auto mt-4 max-w-2xl">
            System CLOIE turns stakeholder evaluations into trustworthy learning-outcome evidence
            for Assumption College of Davao — from evaluation, to response, to attainment analytics
            the college can defend.
          </p>

          {/* Audience entry cards */}
          <div className="mt-12 grid w-full grid-cols-1 gap-5 text-left md:grid-cols-3">
            <PortalChoiceCard
              icon={<GraduationCap className="size-7" />}
              title="Students"
              description="Answer your course evaluations with your ACD Google account. Provisioned by the Secretary's office."
              roles={["Student"]}
              href="/login/student"
              badge="ACD email required"
            />
            <PortalChoiceCard
              icon={<Building2 className="size-7" />}
              title="Staff & Faculty"
              description="Run evaluations, curriculum, and academic operations. One sign-in for every internal role."
              roles={["Secretary", "Dean", "Program Head", "Faculty", "Gen Ed Coordinator"]}
              href="/login/staff"
              badge="ACD email required"
            />
            <PortalChoiceCard
              icon={<Users className="size-7" />}
              title="Alumni & Partners"
              description="Share graduate and industry feedback with email sign-in or any Google account."
              roles={["Alumni", "Industry Partner"]}
              href="/login/external"
              badge="Email or Google"
            />
          </div>

          <p className="text-body-sm text-muted-foreground mt-6">
            New Faculty member?{" "}
            <Link
              href="/register/faculty"
              className="text-primary hover:text-primary-hover font-medium underline-offset-4 hover:underline"
            >
              Submit a Faculty request
            </Link>
          </p>
        </section>

        {/* What it is / what it is not */}
        <section
          aria-labelledby="landing-purpose-heading"
          className="border-border/70 mx-auto max-w-5xl border-t py-14 sm:py-16"
        >
          <h2
            id="landing-purpose-heading"
            className="text-heading-xl text-foreground text-center font-bold tracking-tight"
          >
            Evaluation evidence, end to end
          </h2>
          <p className="text-body-md text-muted-foreground mx-auto mt-3 max-w-2xl text-center">
            System CLOIE manages academic structures and learning outcomes, gathers evaluations from
            the people who experience them, and produces attainment analytics for quality assurance
            and accreditation.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="bg-surface border-border rounded-2xl border p-6 shadow-sm">
              <h3 className="text-title-md text-foreground font-semibold">What System CLOIE is</h3>
              <ul className="mt-4 space-y-3">
                {IS_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle2
                      className="text-success mt-0.5 size-5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-body-md text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-surface border-border rounded-2xl border p-6 shadow-sm">
              <h3 className="text-title-md text-foreground font-semibold">What it is not</h3>
              <ul className="mt-4 space-y-3">
                {IS_NOT_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <XCircle
                      className="text-muted-foreground mt-0.5 size-5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-body-md text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Help and FAQ */}
        <section
          id="help"
          aria-labelledby="landing-help-heading"
          className="border-border/70 mx-auto max-w-3xl scroll-mt-20 border-t py-14 sm:py-16"
        >
          <h2
            id="landing-help-heading"
            className="text-heading-xl text-foreground text-center font-bold tracking-tight"
          >
            Help and frequently asked questions
          </h2>
          <p className="text-body-md text-muted-foreground mx-auto mt-3 max-w-2xl text-center">
            Stuck at sign-in, waiting on a request, or holding an expired code? Start here — or
            contact the Secretary&apos;s office for account help.
          </p>
          <div className="mt-8">
            <EntryHelpFaq />
          </div>
        </section>
      </main>

      <footer className="border-border/80 bg-background/80 relative z-10 border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-2 px-4 py-4 text-center sm:flex-row sm:gap-4 sm:px-6 lg:px-8">
          <p className="text-body-sm text-muted-foreground">
            © {new Date().getFullYear()} System CLOIE. All rights reserved.
          </p>
          <span className="text-border hidden sm:inline" aria-hidden="true">
            |
          </span>
          <nav aria-label="Legal links" className="text-body-sm flex gap-4">
            <Link
              className="text-muted-foreground hover:text-primary focus-visible:ring-ring underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              href="/privacy"
            >
              Privacy Notice
            </Link>
            <Link
              className="text-muted-foreground hover:text-primary focus-visible:ring-ring underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              href="/terms"
            >
              Terms of Use
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
