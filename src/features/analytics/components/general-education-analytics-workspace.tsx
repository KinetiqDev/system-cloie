"use client";

import { createContext, Suspense, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  GENERAL_EDUCATION_ANALYTICS_TAB_LABELS,
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
  summary,
  children,
}: {
  tab: GeneralEducationAnalyticsTab;
  filters: ReactNode;
  /** Frame-wide figures for the committed scope; dimmed while the scope changes. */
  summary?: ReactNode;
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
      {summary ? (
        <div
          aria-busy={isPending || undefined}
          className="transition-opacity duration-150 data-[pending]:opacity-60 motion-reduce:transition-none"
          data-pending={isPending ? "" : undefined}
        >
          {summary}
        </div>
      ) : null}
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
