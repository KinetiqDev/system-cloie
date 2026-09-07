"use client";

import { createContext, Suspense, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ProgramHeadResponsesContentFallback } from "./program-head-responses-content-fallback";

type ResponsesNavigation = {
  isPending: boolean;
  navigate: (href: string) => void;
};

const ResponsesNavigationContext = createContext<ResponsesNavigation | null>(null);

export function useProgramHeadResponsesNavigation(): ResponsesNavigation {
  const navigation = useContext(ResponsesNavigationContext);
  if (!navigation) {
    throw new Error("Responses navigation must be used inside ProgramHeadResponsesWorkspace.");
  }
  return navigation;
}

const TAB_LABELS = {
  course: "Course evaluations",
  "program-wide": "Program-wide",
} as const;

export function ProgramHeadResponsesWorkspace({
  tab,
  filters,
  children,
}: {
  tab: keyof typeof TAB_LABELS;
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
      <section
        aria-label={`${TAB_LABELS[tab]} evidence`}
        aria-busy={isPending || undefined}
        className="min-w-0"
      >
        {isPending ? (
          <ProgramHeadResponsesContentFallback />
        ) : (
          <Suspense fallback={<ProgramHeadResponsesContentFallback />}>{children}</Suspense>
        )}
      </section>
    </ResponsesNavigationContext.Provider>
  );
}
