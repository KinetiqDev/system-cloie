import { Skeleton } from "@/components/ui/skeleton";

export function ProgramHeadAnalyticsContentFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading analytics evidence"
      className="space-y-4"
    >
      <Skeleton aria-hidden="true" className="h-72 w-full rounded-xl" />
      <div className="border-border space-y-3 rounded-xl border p-4">
        <Skeleton aria-hidden="true" className="h-5 w-48" />
        <Skeleton aria-hidden="true" className="h-10 w-full" />
        <Skeleton aria-hidden="true" className="h-10 w-full" />
        <Skeleton aria-hidden="true" className="h-10 w-3/4" />
      </div>
      <span className="sr-only">Loading analytics evidence</span>
    </div>
  );
}
