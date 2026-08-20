"use client";

export default function GenEdCoordinatorAnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <h2 className="text-sm font-semibold text-destructive">Analytics failed to load</h2>
      <p className="text-sm text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-9 w-fit items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}
