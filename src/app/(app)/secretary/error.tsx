"use client";

import { OperationalRouteError } from "@/components/layout/operational-route-error";

export default function SecretaryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <OperationalRouteError error={error} reset={reset} returnHref="/secretary/dashboard" />;
}
