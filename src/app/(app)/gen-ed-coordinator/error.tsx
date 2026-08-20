"use client";

import { OperationalRouteError } from "@/components/layout/operational-route-error";

export default function GenEdCoordinatorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <OperationalRouteError error={error} reset={reset} returnHref="/gen-ed-coordinator/dashboard" />;
}
