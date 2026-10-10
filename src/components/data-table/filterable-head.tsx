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
}: {
  label: string;
  facets?: FacetDef[];
  sort?: { isActive: boolean; direction: "asc" | "desc"; isPending: boolean; onSort: () => void };
  className?: string;
}) {
  const hasFilter = facets !== undefined && facets.length > 0;

  return (
    <TableHead
      aria-label={label}
      aria-sort={
        sort
          ? sort.isActive
            ? sort.direction === "asc"
              ? "ascending"
              : "descending"
            : "none"
          : undefined
      }
      className={className}
    >
      <span className="flex min-w-0 items-center gap-0.5">
        {sort ? (
          <button
            type="button"
            onClick={sort.onSort}
            aria-label={`Sort by ${label}, currently ${sort.isActive ? sort.direction : "unsorted"}`}
            aria-busy={sort.isPending || undefined}
            className="focus-visible:ring-ring inline-flex min-h-11 min-w-0 items-center gap-1 rounded-md font-semibold focus-visible:ring-3 focus-visible:outline-none"
          >
            <span className="truncate">{label}</span>
            {sort.isActive ? (
              sort.direction === "asc" ? (
                <ArrowUp aria-hidden="true" className="size-3.5 shrink-0" />
              ) : (
                <ArrowDown aria-hidden="true" className="size-3.5 shrink-0" />
              )
            ) : (
              <ArrowUpDown aria-hidden="true" className="size-3.5 shrink-0 opacity-50" />
            )}
          </button>
        ) : (
          <span className="min-w-0 truncate pl-1">{label}</span>
        )}
        {hasFilter && (
          <ColumnFilterTrigger label={label} facets={facets} className="ml-auto self-center" />
        )}
      </span>
    </TableHead>
  );
}
