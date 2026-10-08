import { Skeleton } from "@/components/ui/skeleton";
export default function DeanAnalyticsLoading() {
  return (
    <div role="status" aria-label="Loading Dean analytics" className="flex flex-col gap-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2, 3, 4].map((key) => (
          <Skeleton key={key} className="h-40 w-full" />
        ))}
      </div>
    </div>
  );
}
