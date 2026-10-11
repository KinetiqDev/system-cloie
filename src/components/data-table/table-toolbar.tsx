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
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMediaQuery } from "@/components/ui/use-media-query";
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
          <div className="relative order-1 w-full min-w-0 sm:order-2 sm:ml-auto sm:w-64 md:w-72 lg:w-80">
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="h-7"
                >
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
 * Responsive counterpart of the column funnels: once a table collapses to
 * cards (or on surfaces without table column headings), this control provides
 * access to the same facet definitions.
 *
 * - On desktop (>= 768px): renders a focused Popover anchored directly below
 *   the filter button, providing swift in-context refinement without obscuring
 *   the entire workspace with a mobile overlay drawer.
 * - On mobile (< 768px): renders a bottom Drawer with safe-area spacing and
 *   touch-ergonomic controls.
 */
export function TableFilterSheet({
  facets,
  activeCount,
  label = "Filters",
  heading = "Filter this list",
  onClearAll,
  summary,
  triggerClassName,
}: {
  facets: FacetDef[];
  activeCount: number;
  label?: string;
  heading?: string;
  onClearAll: () => void;
  summary: string;
  /**
   * Overrides the trigger's width. Defaults to full width on mobile and
   * auto width on desktop.
   */
  triggerClassName?: string;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Popover>
        <PopoverTrigger
          openOnHover={false}
          render={
            <Button
              variant="outline"
              className={cn("w-full justify-between gap-2.5 sm:w-auto", triggerClassName)}
            />
          }
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">
              {label}
              {activeCount > 0 ? `, ${activeCount} active` : ""}
            </span>
            <span aria-hidden="true">{label}</span>
          </span>
          <span
            className={cn(
              "text-xs transition-colors",
              activeCount > 0 ? "text-primary font-medium" : "text-muted-foreground"
            )}
            aria-hidden="true"
          >
            {activeCount > 0 ? `${activeCount} active` : "Optional"}
          </span>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          className="border-border bg-popover text-popover-foreground w-80 max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-xl border p-0 shadow-lg sm:w-88"
        >
          <div className="border-border/80 bg-surface-primary flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <PopoverTitle className="text-foreground text-sm font-semibold">
                {heading}
              </PopoverTitle>
              {activeCount > 0 && (
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums">
                  {activeCount} active
                </span>
              )}
            </div>
            <PopoverClose
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Close filters"
                  className="text-muted-foreground hover:text-foreground -mr-1 rounded-md"
                />
              }
            >
              <X className="size-3.5" aria-hidden="true" />
            </PopoverClose>
          </div>

          <div className="flex max-h-[min(26rem,calc(100dvh-12rem))] min-w-0 flex-col gap-4 overflow-y-auto px-4 py-3">
            {facets.map((facet) => (
              <div key={facet.id} className="flex min-w-0 flex-col gap-1.5">
                <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
                  {facet.label}
                </p>
                {facet.disabled ? (
                  <p className="text-muted-foreground text-xs leading-normal">
                    {facet.disabledReason ?? "Not available in this view."}
                  </p>
                ) : (
                  <FacetField facet={facet} idPrefix={`popover-${facet.id}`} />
                )}
              </div>
            ))}
          </div>

          <div className="bg-muted/40 border-border/80 flex items-center justify-between gap-2 border-t px-4 py-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              disabled={activeCount === 0}
              className="text-muted-foreground hover:text-foreground h-8 text-xs disabled:opacity-40"
            >
              Reset filters
            </Button>
            <PopoverClose render={<Button size="sm" className="h-8 text-xs font-medium" />}>
              {summary}
            </PopoverClose>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

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
          <SlidersHorizontal className="size-4 shrink-0" aria-hidden="true" />
          {/* Only the count is live, so the trigger announces state, not a moving label. */}
          <span className="sr-only">
            {label}
            {activeCount > 0 ? `, ${activeCount} active` : ""}
          </span>
          <span aria-hidden="true">{label}</span>
        </span>
        <span
          className={cn(
            "text-xs transition-colors",
            activeCount > 0 ? "text-primary font-medium" : "text-muted-foreground"
          )}
          aria-hidden="true"
        >
          {activeCount > 0 ? `${activeCount} active` : "Optional"}
        </span>
      </DrawerTrigger>
      <DrawerContent className="max-h-[88dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>{heading}</DrawerTitle>
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
          <Button variant="outline" onClick={onClearAll} disabled={activeCount === 0}>
            Reset filters
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export const MobileFilterSheet = TableFilterSheet;
