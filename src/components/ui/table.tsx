"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function Table({
  className,
  containerClassName,
  label,
  ...props
}: React.ComponentProps<"table"> & {
  /** Classes for the scrollable container that owns overflow (e.g. bounded height + vertical scrolling). */
  containerClassName?: string;
  /**
   * Names the table's scrollable region for assistive technology, so a page
   * with several tables never presents identical landmarks. Deliberately not
   * derived from `aria-label`: chart cards already publish their own labelled
   * region and their exact-value tables are that region's accessible
   * alternative, so deriving a second name from the table would announce the
   * same landmark twice. Those tables leave this unset and keep the neutral
   * container name; a table that is its own landmark sets it.
   */
  label?: string;
}) {
  return (
    // The overflow container is keyboard-focusable so horizontally scrollable
    // tables stay reachable without a mouse (axe scrollable-region-focusable).
    <div
      data-slot="table-container"
      role="region"
      aria-label={label ? `${label} (scrollable)` : "Table content (scrollable)"}
      tabIndex={0}
      className={cn(
        "focus-visible:outline-ring relative w-full overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2",
        containerClassName
      )}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

/**
 * The heading band every column label sits in. It carries the distinct header
 * fill, and it suppresses the body row's hover so the band never reads as a
 * row the operator can act on.
 */
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "bg-table-header text-table-header-fg [&_tr]:border-table-header-border [&_tr]:border-b [&_tr:has(aria-expanded)]:bg-transparent [&_tr:hover]:bg-transparent",
        className
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-surface-hover has-aria-expanded:bg-surface-hover data-[state=selected]:bg-selected-bg data-[state=selected]:text-selected-fg border-b transition-colors motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-table-header-fg h-11 px-2 text-left align-middle text-xs font-semibold tracking-wider whitespace-nowrap uppercase [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
