"use client";

import { createContext, Suspense, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ANALYTICS_TAB_LABELS,
  type AnalyticsFilterState,
} from "@/features/analytics/services/program-head-analytics-state";
import { ProgramHeadAnalyticsContentFallback } from "./program-head-analytics-content-fallback";

type AnalyticsNavigation = {
  isPending: boolean;
  navigate: (href: string) => void;
};

const AnalyticsNavigationContext = createContext<AnalyticsNavigation | null>(null);

export function useProgramHeadAnalyticsNavigation(): AnalyticsNavigation {
  const navigation = useContext(AnalyticsNavigationContext);
  if (!navigation) {
    throw new Error("Analytics navigation must be used inside ProgramHeadAnalyticsWorkspace.");
  }
  return navigation;
}

export function ProgramHeadAnalyticsWorkspace({
  tab,
  filters,
  children,
}: {
  tab: AnalyticsFilterState["tab"];
  filters: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(href: string) {
    startTransition(() => router.push(href));
  }

  return (
    <AnalyticsNavigationContext.Provider value={{ isPending, navigate }}>
      {filters}
      <section
        aria-label={`${ANALYTICS_TAB_LABELS[tab]} evidence`}
        aria-busy={isPending || undefined}
        className="min-w-0"
      >
        {isPending ? (
          <ProgramHeadAnalyticsContentFallback tab={tab} />
        ) : (
          <Suspense fallback={<ProgramHeadAnalyticsContentFallback tab={tab} />}>
            {children}
          </Suspense>
        )}
      </section>
    </AnalyticsNavigationContext.Provider>
  );
}
