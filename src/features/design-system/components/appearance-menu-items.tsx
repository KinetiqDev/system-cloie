"use client";

import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import type { AppearancePreference } from "@/features/design-system/lib/appearance";
import { APPEARANCE_OPTIONS } from "@/features/design-system/lib/appearance";
import { useAppearance } from "./appearance-provider";

export function AppearanceMenuItems() {
  const { preference, setPreference } = useAppearance();

  return (
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
  );
}
