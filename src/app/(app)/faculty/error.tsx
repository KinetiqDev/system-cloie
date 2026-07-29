"use client";

import { OperationalRouteError } from "@/components/layout/operational-route-error";

export default function FacultyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <OperationalRouteError error={error} reset={reset} returnHref="/faculty/dashboard" />;
}
