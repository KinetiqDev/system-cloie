"use client";

import { useParams } from "next/navigation";
import { OperationalRouteError } from "@/components/layout/operational-route-error";
import { buildProgramHeadDashboardPath } from "@/lib/constants/program-head-routes";

export default function SelectedProgramError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ programId: string }>();

  return (
    <OperationalRouteError
      error={error}
      reset={reset}
      returnHref={buildProgramHeadDashboardPath(params.programId)}
    />
  );
}
