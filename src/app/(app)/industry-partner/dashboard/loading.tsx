import { RespondentDashboardSkeleton } from "@/components/layout/respondent-route-loading";
import { RouteProgress } from "@/components/ui/route-progress";

export default function IndustryPartnerDashboardLoading() {
  return (
    <div
      className="flex min-w-0 flex-col gap-4"
      role="status"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <RouteProgress />
      <RespondentDashboardSkeleton />
    </div>
  );
}
