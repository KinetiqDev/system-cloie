"use client";

import { createContext, Suspense, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  GENERAL_EDUCATION_ANALYTICS_TAB_LABELS,
  type GeneralEducationAnalyticsFilterState,
  type GeneralEducationAnalyticsTab,
} from "@/features/analytics/services/general-education-analytics-state";
import { GeneralEducationAnalyticsContentFallback } from "./general-education-analytics-content-fallback";

type AnalyticsNavigation = {
  isPending: boolean;
  navigate: (href: string) => void;
};

const AnalyticsNavigationContext = createContext<AnalyticsNavigation | null>(null);

export function useGeneralEducationAnalyticsNavigation(): AnalyticsNavigation {
  const navigation = useContext(AnalyticsNavigationContext);
  if (!navigation) {
    throw new Error("Analytics navigation must be used inside GeneralEducationAnalyticsWorkspace.");
  }
  return navigation;
}

/**
 * Coordinator analytics workspace. Filter application and view switching use
 * App Router navigation, so the analytics frame and the filter card stay
 * mounted while only the evidence region presents tab-shaped loading geometry.
 */
export function GeneralEducationAnalyticsWorkspace({
  tab,
  filters,
  children,
}: {
  tab: GeneralEducationAnalyticsTab;
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
        aria-label={`${GENERAL_EDUCATION_ANALYTICS_TAB_LABELS[tab]} evidence`}
        aria-busy={isPending || undefined}
        className="min-w-0"
      >
        {isPending ? (
          <GeneralEducationAnalyticsContentFallback tab={tab} />
        ) : (
          <Suspense fallback={<GeneralEducationAnalyticsContentFallback tab={tab} />}>
            {children}
          </Suspense>
        )}
      </section>
    </AnalyticsNavigationContext.Provider>
  );
}

export type { GeneralEducationAnalyticsFilterState };
