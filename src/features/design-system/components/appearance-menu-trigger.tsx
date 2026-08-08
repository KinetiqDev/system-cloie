"use client";

import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAppearance } from "./appearance-provider";
import type { AppearancePreference } from "@/features/design-system/lib/appearance";
import { APPEARANCE_OPTIONS } from "@/features/design-system/lib/appearance";

/**
 * Topbar appearance control: a ghost icon button that opens a larger
 * dropdown with the Light / Dark / System radio options. Renders nothing
 * when appearance is not available (production gate per ADR 0010).
 */
export function AppearanceMenuTrigger({ enabled = false }: { enabled?: boolean }) {
  const { preference, setPreference } = useAppearance();

  if (!enabled) {
    return null;
  }

  const Icon = APPEARANCE_OPTIONS.find((o) => o.value === preference)?.icon ?? APPEARANCE_OPTIONS[2].icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Appearance"
            className="hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
          />
        }
      >
        <Icon aria-hidden />
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
