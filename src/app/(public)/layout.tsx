import * as React from "react";
import { Suspense } from "react";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background p-4 sm:p-8 text-foreground">
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
