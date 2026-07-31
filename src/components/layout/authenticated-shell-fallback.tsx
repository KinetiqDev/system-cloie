import { Skeleton } from "@/components/ui/skeleton";

export function AuthenticatedShellFallback() {
  return (
    <div
      className="bg-background flex min-h-screen w-full"
      role="status"
      aria-busy="true"
      aria-label="Loading application"
    >
      <aside className="border-border bg-surface fixed inset-y-0 left-0 hidden w-64 flex-col border-r lg:flex">
        <div className="border-border flex h-16 shrink-0 items-center border-b px-6">
          <Skeleton aria-hidden="true" className="size-8 rounded" />
          <Skeleton aria-hidden="true" className="ml-3 h-5 w-28" />
        </div>
        <div className="flex flex-1 flex-col gap-2 px-4 py-6" aria-hidden="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="border-border border-t p-4" aria-hidden="true">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="border-border bg-surface flex h-16 w-full items-center justify-end border-b px-4 sm:px-6">
          <Skeleton aria-hidden="true" className="size-8 rounded-full" />
        </header>
        <main className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-1 flex-col overflow-y-auto p-4 pb-24 sm:p-6 lg:pb-8">
          <div className="sr-only">Loading application</div>
          <div className="flex flex-1 flex-col gap-4" aria-hidden="true">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
