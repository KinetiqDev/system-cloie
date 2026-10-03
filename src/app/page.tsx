import Image from "next/image";
import Link from "next/link";
import { CloieLogoMark } from "@/components/brand/cloie-logo-mark";
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
  "Collects evaluations from students, alumni, and industry partners",
  "Connects learning outcomes and responses to attainment reports for quality assurance",
];

const IS_NOT_POINTS = [
  "Not a learning management system: it does not deliver instruction",
  "Not a student records system: it does not manage grades, transcripts, or enrollment",
];

export default function Home() {
  const appearanceEnabled = resolveAppearanceAvailability();
  return (
    <div className="bg-background relative min-h-screen overflow-hidden">
      {/* Header */}
      <header className="border-border/80 bg-background/80 relative z-10 border-b backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <CloieLogoMark className="h-9" />
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
          className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-backwards mx-auto flex max-w-5xl flex-col items-center py-16 text-center motion-safe:duration-700 sm:py-24"
        >
          <div className="mx-auto mb-6 flex items-center justify-center gap-4 sm:gap-5">
            <div className="border-border flex size-20 items-center justify-center rounded-full border bg-white sm:size-24">
              <Image
                src="/logos/acd-logo.png"
                alt="Assumption College of Davao"
                width={72}
                height={72}
                className="size-14 object-contain sm:size-18"
                priority
              />
            </div>
            <CloieLogoMark className="size-20 sm:size-24" priority />
          </div>

          <h1
            id="landing-hero-heading"
            className="text-display-md text-foreground sm:text-display-lg font-extrabold tracking-tight"
          >
            Welcome to System CLOIE
          </h1>
          <p className="text-body-lg text-muted-foreground mx-auto mt-4 max-w-2xl">
            Answer evaluations. Turn responses into learning-outcome evidence for Assumption College
            of Davao.
          </p>

          {/* Audience entry cards */}
          <div className="mt-9 grid w-full grid-cols-1 gap-4 text-left md:grid-cols-3 lg:gap-6">
            <PortalChoiceCard
              icon={<GraduationCap className="size-7" />}
              title="Students"
              description="Answer course evaluations with your ACD Google account."
              href="/login/student"
              badge="ACD email required"
            />
            <PortalChoiceCard
              icon={<Building2 className="size-7" />}
              title="Staff & Faculty"
              description="Manage evaluations and academic work with your ACD Google account."
              href="/login/staff"
              badge="ACD email required"
            />
            <PortalChoiceCard
              icon={<Users className="size-7" />}
              title="Alumni & Partners"
              description="Share graduate or industry feedback with email or Google."
              href="/login/external"
              badge="Email or Google"
            />
          </div>

          <p className="text-body-sm text-muted-foreground mt-6">
            New Faculty member?{" "}
            <Link
              href="/register/faculty"
              className="text-link hover:text-primary-hover focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
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

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
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
              className="text-muted-foreground hover:text-link focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              href="/privacy"
            >
              Privacy Notice
            </Link>
            <Link
              className="text-muted-foreground hover:text-link focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
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
