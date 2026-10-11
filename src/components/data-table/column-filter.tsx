"use client";

import { useId } from "react";
import { Funnel } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { FacetField } from "./facet-field";
import { facetIsApplied, facetValueLabel, type FacetDef } from "./types";

/**
 * The body every facet popover shares, so a column funnel and the toolbar's
 * home for columnless facets render one implementation rather than two that
 * drift. Each facet is labelled, an unavailable one explains itself, and the
 * whole set clears at once.
 *
 * `onClear` composes the clear into one consumer-owned write. A column
 * carrying several facets must pass it: each facet's `onChange` closes over
 * the committed state, so clearing facet-by-facet issues one navigation per
 * facet from the same snapshot and all but the last are silently dropped.
 * Single-facet columns may omit it and fall back to clearing that one facet.
 */
export function FacetPopoverBody({
  heading,
  facets,
  onClear,
}: {
  /** Names the popover, e.g. the column it narrows. */
  heading: string;
  facets: FacetDef[];
  /** Clears every facet in one write; defaults to clearing each facet in turn. */
  onClear?: () => void;
}) {
  const instanceId = useId();
  const active = facets.filter(facetIsApplied);
  const clear = onClear ?? (() => facets.forEach((facet) => facet.onChange(null)));

  return (
    <PopoverContent align="start" className="w-80 gap-1 p-1.5">
      <PopoverTitle className="text-muted-foreground px-2 pt-1.5 pb-1 text-xs font-semibold tracking-wide uppercase">
        {heading}
      </PopoverTitle>
      {facets.map((facet, index) => (
        <div key={facet.id} className="flex min-w-0 flex-col">
          {facets.length > 1 && (
            <p className="text-foreground px-2 pt-2 pb-1 text-xs font-semibold">{facet.label}</p>
          )}
          {facet.disabled ? (
            <p className="text-muted-foreground px-2 py-2 text-xs leading-normal">
              {facet.disabledReason ?? "Not available in this view."}
            </p>
          ) : (
            <FacetField facet={facet} idPrefix={`${instanceId}-${index}`} />
          )}
        </div>
      ))}
      {active.length > 0 && (
        <div className="border-border mt-1 flex justify-end border-t px-1 pt-1.5">
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            Clear this filter
          </Button>
        </div>
      )}
    </PopoverContent>
  );
}
/**
 * The filter a column heading carries: a funnel that opens that column's own
 * choices in place, so narrowing never leaves the table it narrows.
 */
export function ColumnFilterTrigger({
  label,
  facets,
  className,
  fullCell,
  onClear,
}: {
  label: string;
  facets: FacetDef[];
  className?: string;
  fullCell?: boolean;
  /** Clears every facet in one consumer-owned write; see FacetPopoverBody. */
  onClear?: () => void;
}) {
  const active = facets.filter(facetIsApplied);
  const unavailable = facets.every((facet) => facet.disabled === true);
  const summary = active.map(facetValueLabel).join(", ");

  return (
    <Popover>
      <PopoverTrigger
        openOnHover={false}
        render={
          fullCell ? (
            <button
              type="button"
              disabled={unavailable}
              aria-label={
                unavailable
                  ? `Filter ${label}, unavailable`
                  : `Filter ${label}${active.length > 0 ? `: ${summary}` : ""}`
              }
              className={cn(
                "group/btn focus-visible:ring-ring hover:bg-muted/60 -mx-2 flex min-h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-1.5 rounded-md px-2 text-left text-xs font-semibold tracking-wider whitespace-nowrap uppercase transition-colors focus-visible:ring-3 focus-visible:outline-none",
                active.length > 0
                  ? "text-primary hover:text-primary font-bold"
                  : "text-table-header-fg hover:text-foreground",
                className
              )}
            >
              <span className="min-w-0 truncate leading-tight">{label}</span>
              <Funnel
                aria-hidden="true"
                className={cn(
                  "ml-1 size-3.5 shrink-0 transition-colors",
                  active.length > 0
                    ? "text-primary fill-current"
                    : "text-muted-foreground group-hover/btn:text-foreground"
                )}
              />
            </button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={unavailable}
              aria-label={
                unavailable
                  ? `Filter ${label}, unavailable`
                  : `Filter ${label}${active.length > 0 ? `: ${summary}` : ""}`
              }
              className={cn(
                "text-muted-foreground hover:text-foreground -mr-1 ml-0.5 shrink-0",
                active.length > 0 && "text-primary hover:text-primary",
                className
              )}
            >
              <Funnel
                aria-hidden="true"
                className={cn("size-3.5", active.length > 0 && "fill-current")}
              />
            </Button>
          )
        }
      />
      <FacetPopoverBody heading={`Filter ${label}`} facets={facets} onClear={onClear} />
    </Popover>
  );
}
