import { Skeleton } from "@/components/ui/skeleton";
import { RouteProgress } from "@/components/ui/route-progress";

export default function GenEdOutcomesLoading() {
  return (
    <div
      className="flex min-w-0 flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <RouteProgress />
      <div className="space-y-2">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
