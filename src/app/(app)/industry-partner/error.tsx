"use client";

import { RespondentRouteError } from "@/components/layout/respondent-route-error";

export default function IndustryPartnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RespondentRouteError error={error} reset={reset} returnHref="/industry-partner/dashboard" />
  );
}
