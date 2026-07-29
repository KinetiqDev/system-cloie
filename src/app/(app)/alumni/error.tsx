"use client";

import { RespondentRouteError } from "@/components/layout/respondent-route-error";

export default function AlumniError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RespondentRouteError error={error} reset={reset} returnHref="/alumni/dashboard" />;
}
