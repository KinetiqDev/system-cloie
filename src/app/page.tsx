import Image from "next/image";
import { Building2, Users } from "lucide-react";
import { PortalChoiceCard } from "@/features/portals";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Subtle blue radial glow from top center */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,var(--color-primary-soft),transparent)]" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/80 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Image
              src="/logos/cloie-logo.png"
              alt="CLOIE"
               width={486}
               height={513}
               className="h-9 w-auto shrink-0 object-contain"
            />
            <div className="space-y-0">
              <p className="text-title-md font-bold text-primary">System CLOIE</p>
              <p className="text-caption text-text-muted">Assumption College of Davao</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-3xl text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-backwards">
          {/* Institutional & System Logos */}
          <div className="mx-auto mb-6 flex items-center justify-center gap-4 sm:gap-5">
            <div className="relative flex size-24 items-center justify-center rounded-full bg-white shadow-sm ring-4 ring-primary/10 sm:size-28">
              <Image
                src="/logos/acd-logo.png"
                alt="Assumption College of Davao"
                width={80}
                height={80}
                className="object-contain"
                priority
              />
            </div>
            <div className="relative flex size-24 items-center justify-center rounded-full bg-white shadow-sm ring-4 ring-primary/10 sm:size-28">
              <Image
                src="/logos/cloie-logo.png"
                alt="CLOIE"
                 width={486}
                 height={513}
                 className="h-20 w-auto object-contain"
                priority
              />
            </div>
          </div>

          <h1 className="text-display-md font-extrabold tracking-tight text-text-primary sm:text-display-lg">
            Welcome to System CLOIE
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-body-md text-text-muted">
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

          {/* Footer Divider + System Name */}
          <div className="mt-14 border-t border-border pt-6">
            <p className="text-body-sm text-text-muted">
              System for Comprehensive Learning Outcomes and Instructional Evaluation
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
