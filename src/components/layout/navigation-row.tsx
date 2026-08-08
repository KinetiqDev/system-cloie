"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { NavigationLink } from "./navigation-link";

interface NavigationRowProps extends ComponentProps<typeof NavigationLink> {
  /** Selected destination styling (resolved per surface by the caller). */
  active?: boolean;
  /** Tablet icon-rail geometry: centered until the large-screen sidebar expands. */
  rail?: boolean;
  /** Compact support-row geometry with smaller type. */
  secondary?: boolean;
}

/**
 * Shared presentation row for sidebar, Dean rail, and admin drawer links.
 *
 * Renders the real NavigationLink with the semantic sidebar hover, active,
 * focus, and selected roles. Callers keep matching/aria-current logic and
 * pass the icon, label, and badge children.
 */
export function NavigationRow({
  active = false,
  rail = false,
  secondary = false,
  className,
  ...props
}: NavigationRowProps) {
  return (
    <NavigationLink
      {...props}
      className={cn(
        "group flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 font-medium transition-colors",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
        secondary && "text-body-sm py-2",
        rail && "justify-center md:min-w-11 lg:justify-start",
        className
      )}
    />
  );
}

interface BottomNavRowProps extends ComponentProps<typeof NavigationLink> {
  active?: boolean;
}

/**
 * Shared respondent bottom-navigation row with icon-above-label anatomy.
 * Active destinations use the operational primary role; inactive rows use
 * sidebar muted roles so the bar stays legible in both themes.
 */
export function BottomNavRow({ active = false, className, ...props }: BottomNavRowProps) {
  return (
    <NavigationLink
      {...props}
      className={cn(
        "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 transition-colors",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        active ? "text-link" : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
        className
      )}
    />
  );
}
