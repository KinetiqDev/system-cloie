"use client";

import { createContext, Suspense, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteProgress } from "@/components/ui/route-progress";

type ResponsesNavigation = {
  isPending: boolean;
  navigate: (href: string) => void;
};

const ResponsesNavigationContext = createContext<ResponsesNavigation | null>(null);

export function useGeneralEducationResponsesNavigation(): ResponsesNavigation {
  const navigation = useContext(ResponsesNavigationContext);
  if (!navigation) {
    throw new Error("Responses navigation must be used inside GeneralEducationResponsesWorkspace.");
  }
  return navigation;
}

function GeneralEducationResponsesContentFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading evaluation evidence"
      data-testid="responses-evidence-skeleton"
      className="border-border bg-card flex flex-col gap-4 rounded-xl border shadow-sm"
    >
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-3 border-t p-4">
        {["first", "second", "third"].map((row) => (
          <Skeleton key={row} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export function GeneralEducationResponsesWorkspace({
  filters,
  children,
}: {
  filters: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(href: string) {
    startTransition(() => router.push(href));
  }

  return (
    <ResponsesNavigationContext.Provider value={{ isPending, navigate }}>
      {isPending ? <RouteProgress /> : null}
      {filters}
      <section
        aria-label="Course evaluations evidence"
        aria-busy={isPending || undefined}
        className="min-w-0"
      >
        {isPending ? (
          <GeneralEducationResponsesContentFallback />
        ) : (
          <Suspense fallback={<GeneralEducationResponsesContentFallback />}>{children}</Suspense>
        )}
      </section>
    </ResponsesNavigationContext.Provider>
  );
}
