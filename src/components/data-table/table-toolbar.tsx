"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { FacetField } from "./facet-field";
import { facetChipLabel, facetIsApplied, type FacetDef } from "./types";

/**
 * The quiet line above a list: free-text search for facets that span columns,
 * a chip per applied column filter, and the one clear-all exit. Filters never
 * collect here as form fields; the columns own their own narrowing.
 */
export function TableToolbar({
  search,
  resultSummary,
  facets = [],
  onClearAll,
  children,
  actions,
}: {
  /** Free-text search for facets that belong to no single column. */
  search?: {
    id: string;
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
  };
  /** Rendered at the end of the line, e.g. a result count. */
  resultSummary?: ReactNode;
  /** Every filterable facet, so applied ones can show as removable chips. */
  facets?: FacetDef[];
  onClearAll?: () => void;
  children?: ReactNode;
  /** Primary or contextual action(s) rendered below the search input. */
  actions?: ReactNode;
}) {
  const applied = facets.filter(facetIsApplied);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="order-2 flex min-w-0 flex-wrap items-center justify-between gap-2 empty:hidden sm:order-1 sm:justify-start">
          {children}
          {resultSummary && <div className="shrink-0">{resultSummary}</div>}
        </div>
        {search && (
          <div className="order-1 relative min-w-0 w-full sm:order-2 sm:w-64 md:w-72 lg:w-80 sm:ml-auto">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id={search.id}
              type="search"
              aria-label={search.label}
              placeholder={search.placeholder}
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              onFocus={search.onFocus}
              onBlur={search.onBlur}
              className="pl-9"
              autoComplete="off"
            />
          </div>
        )}
      </div>

      {(applied.length > 0 || actions) && (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {applied.length > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {applied.map((facet) => (
                <button
                  key={facet.id}
                  type="button"
                  aria-label={`Remove filter ${facetChipLabel(facet)}`}
                  onClick={() => facet.onChange(null)}
                  className="border-border bg-card text-foreground hover:bg-surface-hover focus-visible:ring-ring inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none"
                >
                  <span aria-hidden="true" className="truncate">
                    {facetChipLabel(facet)}
                  </span>
                  <X aria-hidden="true" className="text-muted-foreground size-3.5 shrink-0" />
                </button>
              ))}
              {onClearAll && (
                <Button type="button" variant="ghost" size="sm" onClick={onClearAll} className="h-7">
                  Clear all
                </Button>
              )}
            </div>
          ) : (
            <div className="hidden sm:block" />
          )}
          {actions && <div className="shrink-0 sm:ml-auto">{actions}</div>}
        </div>
      )}
    </div>
  );
}

/**
 * The mobile counterpart of the column funnels: once a table collapses to
 * cards there is no heading row left to hang filters on, so the same facet
 * definitions open in one sheet instead. Facets apply as they change, exactly
 * as the funnels do, and the sheet's action simply closes it.
 */
export function MobileFilterSheet({
  facets,
  activeCount,
  label = "Filters",
  onClearAll,
  summary,
  triggerClassName,
}: {
  facets: FacetDef[];
  activeCount: number;
  label?: string;
  onClearAll: () => void;
  summary: string;
  /**
   * Overrides the trigger's width. It spans its container by default, which
   * suits a full-width filter row; a caller placing it beside other content
   * asks for an inline-width trigger instead.
   */
  triggerClassName?: string;
}) {
  return (
    <Drawer showSwipeHandle>
      <DrawerTrigger
        render={
          <Button
            variant="outline"
            className={cn("w-full justify-between gap-2", triggerClassName)}
          />
        }
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {/* Only the count is live, so the trigger announces state, not a moving label. */}
          <span className="sr-only">
            {label}
            {activeCount > 0 ? `, ${activeCount} active` : ""}
          </span>
          <span aria-hidden="true">{label}</span>
        </span>
        <span className="text-muted-foreground" aria-hidden="true">
          {activeCount > 0 ? `${activeCount} active` : "Optional"}
        </span>
      </DrawerTrigger>
      <DrawerContent className="max-h-[88dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Filter this list</DrawerTitle>
        </DrawerHeader>
        <div className="grid min-h-0 gap-3 overflow-y-auto px-4 py-2">
          {facets.map((facet) => (
            <div key={facet.id} className="flex min-w-0 flex-col gap-1">
              <p className="text-foreground text-sm font-semibold">{facet.label}</p>
              {facet.disabled ? (
                <p className="text-muted-foreground text-xs leading-normal">
                  {facet.disabledReason ?? "Not available in this view."}
                </p>
              ) : (
                <FacetField facet={facet} idPrefix={`sheet-${facet.id}`} />
              )}
            </div>
          ))}
        </div>
        <DrawerFooter className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <DrawerClose render={<Button />}>{summary}</DrawerClose>
          <Button variant="outline" onClick={onClearAll}>
            Reset filters
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
