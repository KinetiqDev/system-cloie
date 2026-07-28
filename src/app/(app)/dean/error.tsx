"use client";

import { OperationalRouteError } from "@/components/layout/operational-route-error";

export default function DeanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <OperationalRouteError error={error} reset={reset} returnHref="/dean/dashboard" />;
}
