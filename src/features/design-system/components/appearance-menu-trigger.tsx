"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppearance } from "./appearance-provider";
import type { AppearancePreference } from "@/features/design-system/lib/appearance";
import { APPEARANCE_OPTIONS } from "@/features/design-system/lib/appearance";

/**
 * Appearance control: a ghost button that opens a larger dropdown with the
 * Light / Dark / System radio options. It carries a visible "Appearance" label
 * from the `sm` breakpoint up and collapses to the icon alone on narrow
 * screens, matching the Help link in the same topbar utility row so the row
 * stays balanced. A `min-h-11` floor keeps the target at 44 px at every
 * breakpoint, not only on coarse pointers. The default styling belongs to the
 * sidebar chrome it was introduced in; surfaces outside the sidebar pass the
 * hover treatment of their own background. Renders nothing when appearance is
 * not available (production gate per ADR 0010).
 */
export function AppearanceMenuTrigger({
  enabled = false,
  className,
}: {
  enabled?: boolean;
  className?: string;
}) {
  const { preference, setPreference } = useAppearance();

  if (!enabled) {
    return null;
  }

  const Icon =
    APPEARANCE_OPTIONS.find((o) => o.value === preference)?.icon ?? APPEARANCE_OPTIONS[2].icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            aria-label="Appearance"
            className={cn(
              "hover:bg-sidebar-accent/40 hover:text-sidebar-foreground min-h-11",
              className
            )}
          />
        }
      >
        <Icon aria-hidden data-icon="inline-start" />
        {/* Label on roomier viewports; on narrow screens the utility row is
            tight, so the visible label collapses to the icon while the
            accessible name stays "Appearance". Matches the Help link in the
            same row. */}
        <span className="hidden sm:inline">Appearance</span>
        <span className="sr-only sm:hidden">Appearance</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <p className="text-caption text-text-muted px-3 pt-2 pb-1 font-medium tracking-wide uppercase">
          Appearance
        </p>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={preference ?? "system"}
          onValueChange={(value) => setPreference(value as AppearancePreference)}
        >
          {APPEARANCE_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="min-h-11">
              <option.icon className="size-4" />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
