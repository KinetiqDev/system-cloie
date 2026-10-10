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
 * Appearance control: an icon-only outline button with a visible border affordance
 * that opens a dropdown with the Light / Dark / System radio options.
 * Keeps an accessible name of "Appearance" via aria-label and sr-only label,
 * with native title tooltip. Uses size="icon-sm" (32 px on desktop, 44 px touch floor
 * on coarse pointers) matching adjacent topbar utility controls.
 * Renders nothing when appearance is not available (production gate per ADR 0010).
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
            variant="outline"
            size="icon-sm"
            aria-label="Appearance"
            title="Appearance"
            className={cn("shadow-2xs", className)}
          />
        }
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">Appearance</span>
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
