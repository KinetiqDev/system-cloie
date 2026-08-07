import { Skeleton } from "@/components/ui/skeleton";

export default function AppearanceSettingsLoading() {
  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="border-border bg-surface rounded-2xl border p-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-11 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
