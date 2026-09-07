import { SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function EvidenceTableSkeleton() {
  return (
    <div
      data-testid="responses-table-skeleton"
      className="hidden flex-col gap-3 lg:flex"
      aria-hidden="true"
    >
      <div className="grid grid-cols-7 gap-4">
        {[
          "Evaluation",
          "Stakeholder",
          "Target",
          "Period",
          "Status",
          "Submitted",
          "Mean / scale",
        ].map((heading) => (
          <span key={heading} className="text-label-sm text-muted-foreground font-medium">
            {heading}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-4 overflow-x-auto pt-1">
        {["first", "second", "third", "fourth"].map((row) => (
          <div key={row} className="grid min-w-0 grid-cols-7 items-center gap-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceCardsSkeleton() {
  return (
    <div
      data-testid="responses-cards-skeleton"
      className="flex flex-col gap-3 lg:hidden"
      aria-hidden="true"
    >
      {["first", "second", "third"].map((card) => (
        <div key={card} className="border-border flex flex-col gap-2 rounded-xl border p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProgramHeadResponsesContentFallback() {
  const label = "Loading evaluation evidence";
  return (
    <Card
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      data-testid="responses-evidence-skeleton"
    >
      <CardHeader>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent>
        <EvidenceCardsSkeleton />
        <EvidenceTableSkeleton />
        <span className="sr-only">{label}</span>
      </CardContent>
    </Card>
  );
}

export function ProgramHeadResponsesRouteFallback() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading responses"
      className="flex min-w-0 flex-col gap-6"
    >
      <Skeleton className="h-4 w-56" />
      <header className="border-border flex flex-col gap-2 border-b pb-5">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-full max-w-3xl" />
      </header>
      <nav aria-label="Loading response views" className="border-border grid grid-cols-2 border-b">
        <Skeleton className="h-11 w-36" />
        <Skeleton className="h-11 w-36" />
      </nav>
      <Card data-testid="responses-filter-skeleton">
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-3 w-full max-w-xl" />
        </CardHeader>
        <CardContent>
          <div className="hidden grid-cols-2 items-end gap-4 lg:grid xl:grid-cols-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
          <Skeleton className="h-11 w-full lg:hidden" />
        </CardContent>
      </Card>
      <ProgramHeadResponsesContentFallback />
    </div>
  );
}
