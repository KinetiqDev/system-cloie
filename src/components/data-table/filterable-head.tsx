"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { ColumnFilterTrigger } from "./column-filter";
import type { FacetDef } from "./types";

/**
 * A column heading that can carry its own filter, its own sort control, or
 * both. The `aria-label` on the cell keeps the column's accessible name stable
 * no matter what controls the heading holds.
 */
export function FilterableHead({
  label,
  facets,
  sort,
  className,
  onClear,
}: {
  label: string;
  facets?: FacetDef[];
  sort?: { isActive: boolean; direction: "asc" | "desc"; isPending: boolean; onSort: () => void };
  className?: string;
  /** Clears every facet in one consumer-owned write; see FacetPopoverBody. */
  onClear?: () => void;
}) {
  const hasFilter = facets !== undefined && facets.length > 0;

  return (
    <TableHead aria-label={label} aria-sort={ariaSort(sort)} className={className}>
      {hasFilter && !sort ? (
        <ColumnFilterTrigger label={label} facets={facets} fullCell onClear={onClear} />
      ) : (
        <span className="flex min-w-0 items-center gap-0.5 whitespace-normal">
          {sort ? (
            <button
              type="button"
              onClick={sort.onSort}
              aria-label={`Sort by ${label}, currently ${sort.isActive ? sort.direction : "unsorted"}`}
              aria-busy={sort.isPending || undefined}
              className="focus-visible:ring-ring hover:bg-muted/40 -ml-1 inline-flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-md px-1 font-semibold transition-colors focus-visible:ring-3 focus-visible:outline-none"
            >
              <span className="min-w-0 leading-tight">{label}</span>
              <SortDirectionIcon active={sort.isActive} direction={sort.direction} />
            </button>
          ) : (
            <span className="min-w-0 pl-1 leading-tight">{label}</span>
          )}
          {hasFilter && (
            <ColumnFilterTrigger
              label={label}
              facets={facets}
              className="ml-auto self-center"
              onClear={onClear}
            />
          )}
        </span>
      )}
    </TableHead>
  );
}
function SortDirectionIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown aria-hidden="true" className="size-3.5 shrink-0 opacity-50" />;
  return direction === "asc" ? (
    <ArrowUp aria-hidden="true" className="size-3.5 shrink-0" />
  ) : (
    <ArrowDown aria-hidden="true" className="size-3.5 shrink-0" />
  );
}

function ariaSort(
  sort: { isActive: boolean; direction: "asc" | "desc" } | undefined
): "ascending" | "descending" | "none" | undefined {
  if (!sort) return undefined;
  if (!sort.isActive) return "none";
  return sort.direction === "asc" ? "ascending" : "descending";
}
