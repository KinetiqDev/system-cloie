import * as React from "react";
import { Suspense } from "react";
import { AppearanceMenuTrigger } from "@/features/design-system/components/appearance-menu-trigger";
import { resolveAppearanceAvailability } from "@/features/design-system/services/resolve-appearance-availability";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const appearanceEnabled = resolveAppearanceAvailability();

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background p-4 text-foreground sm:p-8">
      <div className="absolute top-4 right-4 z-40 sm:top-6 sm:right-6">
        <AppearanceMenuTrigger enabled={appearanceEnabled} />
      </div>
      <Suspense
        fallback={
          <div className="flex h-full w-full animate-pulse items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}
