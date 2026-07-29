"use client";

import { OperationalRouteError } from "@/components/layout/operational-route-error";

export default function ProgramHeadError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <OperationalRouteError error={error} reset={reset} returnHref="/program-head/dashboard" />;
}
