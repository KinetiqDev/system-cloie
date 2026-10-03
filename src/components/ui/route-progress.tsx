import { cn } from "@/lib/utils";

/**
 * RouteProgress — indeterminate bar shown at the top of route loading shells.
 * Animation is transform-based; honors reduced motion with a static partial
 * fill so the track still reads as "in progress".
 */
export function RouteProgress({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-muted relative h-0.5 w-full overflow-hidden rounded-full", className)}
    >
      <div className="bg-primary absolute inset-y-0 w-1/3 rounded-full motion-safe:animate-[route-indeterminate_1.2s_ease-in-out_infinite] motion-reduce:w-2/3 motion-reduce:opacity-70" />
    </div>
  );
}
