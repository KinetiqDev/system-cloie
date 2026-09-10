import * as React from "react";
import { Suspense } from "react";
import { PublicRouteLoading } from "@/components/layout/public-route-loading";
import { AppearanceMenuTrigger } from "@/features/design-system/components/appearance-menu-trigger";
import { resolveAppearanceAvailability } from "@/features/design-system/services/resolve-appearance-availability";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const appearanceEnabled = resolveAppearanceAvailability();

  return (
    <div className="bg-background text-foreground flex min-h-screen w-full flex-col overflow-hidden">
      {/* Page chrome: the appearance control sits in flow so it can never
          overlap a focused form, and it aligns to the public content gutter. */}
      <div className="mx-auto flex w-full max-w-7xl shrink-0 items-center justify-end px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <AppearanceMenuTrigger
          enabled={appearanceEnabled}
          className="hover:bg-muted hover:text-foreground"
        />
      </div>
      <main className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8">
        <Suspense fallback={<PublicRouteLoading variant="status" />}>{children}</Suspense>
      </main>
    </div>
  );
}
