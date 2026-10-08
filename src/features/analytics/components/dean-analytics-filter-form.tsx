"use client";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { deanAnalyticsUrl, parseDeanAnalyticsFilters } from "../services/dean-analytics-state";
export function DeanAnalyticsFilterForm({
  children,
  scopeKey,
}: {
  children: ReactNode;
  scopeKey: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form
      key={scopeKey}
      action="/dean/analytics"
      aria-busy={pending}
      className="bg-card grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
        const filters = parseDeanAnalyticsFilters(
          Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)]))
        );
        startTransition(() => router.push(deanAnalyticsUrl(filters)));
      }}
    >
      {children}
      {pending && (
        <p className="text-body-sm text-muted-foreground" role="status">
          Updating evidence…
        </p>
      )}
    </form>
  );
}
