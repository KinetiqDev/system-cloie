import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function GenEdDashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading General Education dashboard" aria-busy="true">
      {/* KPI grid — 1/2/4 to mirror dashboard; header is rendered outside Suspense */}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-2 h-7 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Promo cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-9 w-44" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
