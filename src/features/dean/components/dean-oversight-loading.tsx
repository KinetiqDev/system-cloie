import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DeanDashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading readiness details" aria-busy="true">
      <section className="flex flex-col gap-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function DeanLearningOutcomesLoading() {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading Learning Outcomes" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index}>
          <CardContent className="flex min-h-20 items-center justify-between gap-4 p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-3 w-64 max-w-full" />
              <Skeleton className="h-3 w-80 max-w-full" />
            </div>
            <Skeleton className="h-6 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DeanEnrollmentsLoading() {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading enrollment totals" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index}>
          <CardContent className="flex min-h-20 items-center justify-between gap-4 p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DeanRosterLoading() {
  return (
    <Card aria-label="Loading class roster" aria-busy="true">
      <CardHeader className="flex flex-col gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-11 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
