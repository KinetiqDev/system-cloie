import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type OperationalLoadingVariant =
  | "dashboard"
  | "list"
  | "users"
  | "form"
  | "courseForm"
  | "detail"
  | "responseReview"
  | "schoolYearDetail"
  | "outcomeMapping"
  | "rollover"
  | "profile";

const loadingLabels: Record<OperationalLoadingVariant, string> = {
  dashboard: "Loading dashboard",
  list: "Loading records",
  users: "Loading users",
  form: "Loading form",
  courseForm: "Loading form",
  detail: "Loading review details",
  responseReview: "Loading response review",
  schoolYearDetail: "Loading school year details",
  outcomeMapping: "Loading CILO-PLO mappings",
  rollover: "Loading rollover workspace",
  profile: "Loading profile",
};

function PageHeader() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-4 w-full max-w-2xl" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item}>
            <CardHeader className="flex flex-col gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-20" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((item) => (
          <Card key={item}>
            <CardHeader className="flex flex-col gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-52 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ListRecordsSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-48" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="hidden gap-6 md:grid md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-4 w-24" />
            ))}
          </div>
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex flex-col gap-3 rounded-lg border p-4 md:grid md:grid-cols-4"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20 md:justify-self-end" />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <ListRecordsSkeleton />
    </div>
  );
}

function UsersSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item}>
            <CardHeader className="flex flex-col gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-20" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <ListRecordsSkeleton />
    </div>
  );
}

function FormSkeleton({ className = "flex max-w-4xl flex-col gap-6" }: { className?: string }) {
  return (
    <div className={className}>
      <PageHeader />
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-28 w-full" />
          <div className="flex justify-end gap-3">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-28" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex gap-3 border-b pb-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-8 w-24" />
            ))}
          </div>
          <Skeleton className="h-6 w-72 max-w-full" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex flex-col gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full max-w-2xl" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SchoolYearDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((item) => (
          <Card key={item}>
            <CardHeader className="flex flex-col gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-4 w-56 max-w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ResponseReviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-40" />
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <Skeleton className="h-6 w-64 max-w-full" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-56 max-w-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-2xl" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function OutcomeMappingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="flex flex-col gap-4 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((badge) => (
                  <Skeleton key={badge} className="h-6 w-20 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function RolloverSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <Card className="max-w-3xl">
        <CardHeader className="flex flex-col gap-3">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center gap-4 rounded-lg border p-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72 max-w-full" />
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <PageHeader />
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((card) => (
          <Card key={card}>
            <CardHeader className="flex flex-row items-center gap-4">
              <Skeleton className="size-9 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-56 max-w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function OperationalRouteLoading({ variant }: { variant: OperationalLoadingVariant }) {
  return (
    <div className="min-w-0" role="status" aria-busy="true" aria-label={loadingLabels[variant]}>
      {variant === "dashboard" && <DashboardSkeleton />}
      {variant === "list" && <ListSkeleton />}
      {variant === "users" && <UsersSkeleton />}
      {variant === "form" && <FormSkeleton />}
      {variant === "courseForm" && (
        <FormSkeleton className="mx-auto flex max-w-3xl flex-col gap-6" />
      )}
      {variant === "detail" && <DetailSkeleton />}
      {variant === "responseReview" && <ResponseReviewSkeleton />}
      {variant === "schoolYearDetail" && <SchoolYearDetailSkeleton />}
      {variant === "outcomeMapping" && <OutcomeMappingSkeleton />}
      {variant === "rollover" && <RolloverSkeleton />}
      {variant === "profile" && <ProfileSkeleton />}
    </div>
  );
}
