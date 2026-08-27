"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BulkActionBarProps = {
  selectedCount: number;
  itemLabel: string;
  onClear: () => void;
  children: ReactNode;
  className?: string;
};

export function BulkActionBar({
  selectedCount,
  itemLabel,
  onClear,
  children,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className={cn(
        "border-primary/25 bg-selected-bg text-selected-fg sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 flex flex-col gap-3 rounded-xl border p-3 shadow-lg sm:static sm:flex-row sm:items-center sm:justify-between sm:shadow-sm",
        className
      )}
    >
      <p className="text-sm font-semibold tabular-nums" aria-live="polite">
        {selectedCount} {selectedCount === 1 ? itemLabel : `${itemLabel}s`} selected
      </p>
      <div className="flex flex-wrap items-center gap-2 [&_[data-slot=button]]:pointer-coarse:min-h-11">
        {children}
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X aria-hidden="true" className="size-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
