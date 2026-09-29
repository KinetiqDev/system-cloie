import Image from "next/image";
import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { PortalChoiceCard, InstallAppButton } from "@/features/portals";
import { AppearanceMenuTrigger } from "@/features/design-system/components/appearance-menu-trigger";
import { resolveAppearanceAvailability } from "@/features/design-system/services/resolve-appearance-availability";
import {
  DevRoleSwitcher,
  DevRoleSwitcherDesktop,
} from "@/features/auth/components/dev-role-switcher";

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

      <main className="relative z-10 flex flex-col items-center justify-center px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-backwards mx-auto max-w-3xl text-center motion-safe:duration-700">
          {/* Institutional & System Logos */}
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

          <h1 className="text-display-md text-foreground sm:text-display-lg font-extrabold tracking-tight">
            Welcome to System CLOIE
          </h1>
          <p className="text-body-md text-muted-foreground mx-auto mt-3 max-w-lg">
            Select your portal to sign in or register.
          </p>

          {/* Portal Choice Grid */}
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
            <PortalChoiceCard
              icon={<Building2 className="size-7" />}
              title="ACD Staff & Faculty"
              description="Manage evaluations, curriculum, and academic operations."
              roles={["Secretary", "Dean", "Program Head", "Faculty"]}
              href="/portal/staff"
              badge="ACD email required"
            />
            <PortalChoiceCard
              icon={<Users className="size-7" />}
              title="Students, Alumni & Partners"
              description="Participate in evaluations, surveys, and feedback programs."
              roles={["Student", "Alumni", "Industry Partner"]}
              href="/portal/respondents"
              badge="Any Google account"
            />
          </div>
        </div>
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
