import { CalendarDays, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type ResultSummaryStripProps = {
  /** Noun for the record kind, e.g. "assignment" or "roster". */
  noun?: string;
  total: number;
  activeCount: number;
  /** 0-based, matching the server page index. */
  page: number;
  pageSize: number;
  /** Trailing scope label, e.g. the Academic Period in force. */
  scopeLabel: string;
};

/**
 * The one-line result count every Course-assignment list carries: how many rows
 * the current filters produced, their active/inactive split, the page, and the
 * scope in force. Replaces a section heading plus a separate status chip.
 */
export function ResultSummaryStrip({
  noun = "assignment",
  total,
  activeCount,
  page,
  pageSize,
  scopeLabel,
}: ResultSummaryStripProps) {
  const inactiveCount = total > 0 ? total - activeCount : 0;
  const isSinglePage = total <= pageSize;
  const showStatusBreakdown = isSinglePage && total > 0;

  return (
    <div className="bg-card flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 shadow-xs sm:justify-between sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-primary/5 text-primary ring-primary/20 flex size-9 shrink-0 items-center justify-center rounded-lg ring-1">
          <Users aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p
            className="truncate text-sm leading-none font-semibold tabular-nums"
            role="status"
            aria-live="polite"
          >
            {total} {total === 1 ? noun : `${noun}s`}
          </p>
          <p className="text-muted-foreground truncate text-xs tabular-nums">
            {total === 0 ? (
              "No records in current view"
            ) : showStatusBreakdown ? (
              <>
                <span className="text-foreground font-medium">{activeCount} active</span>
                {inactiveCount > 0 && (
                  <>
                    <span className="text-border-strong mx-1.5">·</span>
                    <span>{inactiveCount} inactive</span>
                  </>
                )}
                <span className="text-border-strong mx-1.5 hidden sm:inline">·</span>
                <span className="hidden sm:inline">page {page + 1}</span>
              </>
            ) : (
              <span>page {page + 1}</span>
            )}
          </p>
        </div>
      </div>
      <Badge
        variant="outline"
        className="bg-background ml-auto hidden max-w-[55%] min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium sm:inline-flex"
        title={scopeLabel}
      >
        <CalendarDays aria-hidden="true" />
        <span className="min-w-0 truncate">{scopeLabel}</span>
      </Badge>
    </div>
  );
}
