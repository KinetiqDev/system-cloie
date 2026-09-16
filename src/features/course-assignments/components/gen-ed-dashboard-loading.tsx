import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function GenEdDashboardLoading() {
  return (
    <div
      className="flex min-w-0 flex-col gap-6"
      aria-label="Loading General Education dashboard"
      aria-busy="true"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-72 max-w-full" />
          <Skeleton className="h-4 w-[32rem] max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-10 w-full sm:w-44" />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="min-w-0">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="size-4 rounded-full" />
                </div>
                <Skeleton className="h-9 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-36 max-w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.82fr)]">
        {Array.from({ length: 2 }, (_, index) => (
          <section key={index} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <Card className="min-h-64">
              <CardHeader>
                <Skeleton className="h-5 w-48 max-w-full" />
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }, (_, itemIndex) => (
                  <div key={itemIndex} className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-36" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
