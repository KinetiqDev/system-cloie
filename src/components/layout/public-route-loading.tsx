import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PublicLoadingVariant = "portal" | "form" | "status";

const loadingLabels: Record<PublicLoadingVariant, string> = {
  portal: "Loading portal",
  form: "Loading form",
  status: "Loading page",
};

function PortalSkeleton({ cardCount }: { cardCount: 3 | 4 }) {
  const gridClassName =
    cardCount === 3
      ? "mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-5 w-full max-w-md" />
        <div className="mt-2 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Skeleton className="h-9 w-full sm:w-56" />
          <Skeleton className="h-9 w-full sm:w-64" />
        </div>
      </div>
      <div className={gridClassName}>
        {Array.from({ length: cardCount }, (_, index) => index + 1).map((card) => (
          <Card key={card} className="h-full">
            <CardHeader className="flex flex-col gap-3">
              <Skeleton className="size-11 rounded-xl" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-4 w-full max-w-[16rem]" />
              <Skeleton className="h-11 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

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

export function PublicRouteLoading({
  variant,
  portalCardCount = 3,
}: {
  variant: PublicLoadingVariant;
  portalCardCount?: 3 | 4;
}) {
  return (
    <div
      className="w-full min-w-0"
      role="status"
      aria-busy="true"
      aria-label={loadingLabels[variant]}
    >
      {variant === "portal" && <PortalSkeleton cardCount={portalCardCount} />}
      {variant === "form" && <FormSkeleton />}
      {variant === "status" && <StatusSkeleton />}
    </div>
  );
}
