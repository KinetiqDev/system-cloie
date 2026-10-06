"use client";

import { createContext, Suspense, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ResponsesContentFallback } from "./responses-content-fallback";

// ---------------------------------------------------------------------------
// Identified-review workspace shell (spec §12, ADR 0034)
//
// Every review owner — Program Head on Program-specific/Central evidence,
// Coordinator on General Education — filters the same kind of evaluation list
// through the same interactions: a filter panel that stays mounted while the
// evidence region reloads behind a transition. Only the section label differs,
// so it arrives as a prop rather than a per-role copy.
// ---------------------------------------------------------------------------

type ResponsesNavigation = {
  isPending: boolean;
  navigate: (href: string) => void;
};

const ResponsesNavigationContext = createContext<ResponsesNavigation | null>(null);

export function useResponsesNavigation(): ResponsesNavigation {
  const navigation = useContext(ResponsesNavigationContext);
  if (!navigation) {
    throw new Error("Responses navigation must be used inside ResponsesWorkspace.");
  }
  return navigation;
}

export function ResponsesWorkspace({
  sectionLabel,
  filters,
  children,
}: {
  /** Accessible name of the evidence region, e.g. "Course evaluations evidence". */
  sectionLabel: string;
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
      {filters}
      <section aria-label={sectionLabel} aria-busy={isPending || undefined} className="min-w-0">
        {isPending ? (
          <ResponsesContentFallback />
        ) : (
          <Suspense fallback={<ResponsesContentFallback />}>{children}</Suspense>
        )}
      </section>
    </ResponsesNavigationContext.Provider>
  );
}
