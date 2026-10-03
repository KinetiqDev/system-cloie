import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteProgress } from "@/components/ui/route-progress";

type PublicLoadingVariant = "form" | "status";

const loadingLabels: Record<PublicLoadingVariant, string> = {
  form: "Loading form",
  status: "Loading page",
};

function FormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <Skeleton className="h-6 w-56 max-w-full" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {[1, 2, 3, 4].map((field) => (
            <div key={field} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusSkeleton() {
  return (
    <div className="mx-auto w-full max-w-lg">
      <Card>
        <CardHeader className="flex flex-col items-center gap-4 text-center">
          <Skeleton className="size-16 rounded-2xl" />
          <Skeleton className="h-6 w-64 max-w-full" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function PublicRouteLoading({ variant }: { variant: PublicLoadingVariant }) {
  return (
    <div
      className="flex w-full min-w-0 flex-col gap-4"
      role="status"
      aria-busy="true"
      aria-label={loadingLabels[variant]}
    >
      <RouteProgress />
      {variant === "form" && <FormSkeleton />}
      {variant === "status" && <StatusSkeleton />}
    </div>
  );
}
