import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type RespondentLoadingVariant = "evaluations" | "evaluation" | "history" | "submission" | "profile";

const loadingLabels: Record<RespondentLoadingVariant, string> = {
  evaluations: "Loading your evaluations",
  evaluation: "Loading your evaluation form",
  history: "Loading your submission history",
  submission: "Loading your submitted evaluation",
  profile: "Loading your profile",
};

/**
 * Body of the evaluations route (filters + list), without the static intro
 * section. Exported so a page that already streams its own intro can reuse the
 * exact same skeleton for an in-page Suspense boundary.
 */
export function EvaluationBrowserSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-full md:w-64" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
      <div className="grid gap-4">
        {[1, 2, 3].map((item) => (
          <Card key={item} className="border-border">
            <CardContent className="flex items-center gap-4 p-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EvaluationListSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <section className="bg-surface rounded-xl p-8">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
        <Skeleton className="mt-2 h-5 w-2/3 max-w-xl" />
      </section>

      <EvaluationBrowserSkeleton />
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="hidden gap-6 rounded-xl border p-4 md:grid md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-4 w-24" />
          ))}
        </div>
        {[1, 2, 3].map((item) => (
          <Card key={item} className="border-border">
            <CardContent className="flex flex-col gap-4 p-4 md:grid md:grid-cols-4 md:items-center">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 md:justify-self-end" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EvaluationSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-48" />
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-col gap-3">
          <Skeleton className="h-6 w-64 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex flex-col gap-4">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-full max-w-2xl" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
          <div className="flex justify-end">
            <Skeleton className="h-9 w-28" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SubmissionSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-36" />
      <Card className="border-border">
        <CardHeader className="flex flex-col gap-3">
          <Skeleton className="h-7 w-72 max-w-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex flex-col gap-3">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((item) => (
          <Card key={item} className="border-border">
            <CardHeader className="flex flex-row items-center gap-4">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        <Card className="border-border md:col-span-2">
          <CardContent className="flex gap-4 p-6">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full max-w-2xl" />
              <Skeleton className="h-4 w-2/3 max-w-xl" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function RespondentRouteLoading({ variant }: { variant: RespondentLoadingVariant }) {
  return (
    <div className="min-w-0" role="status" aria-busy="true" aria-label={loadingLabels[variant]}>
      {variant === "evaluations" && <EvaluationListSkeleton />}
      {variant === "evaluation" && <EvaluationSkeleton />}
      {variant === "history" && <HistorySkeleton />}
      {variant === "submission" && <SubmissionSkeleton />}
      {variant === "profile" && <ProfileSkeleton />}
    </div>
  );
}
