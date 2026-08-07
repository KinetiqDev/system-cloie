"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { AppearancePreference } from "@/features/design-system/lib/appearance";
import { useAppearance } from "./appearance-provider";

export const APPEARANCE_OPTIONS: ReadonlyArray<{
  value: AppearancePreference;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function AppearanceSelector() {
  const { preference, setPreference } = useAppearance();

  return (
    <RadioGroup
      aria-label="Appearance"
      className="gap-3"
      value={preference ?? "system"}
      onValueChange={(value) => setPreference(value as AppearancePreference)}
    >
      {APPEARANCE_OPTIONS.map((option) => (
        <label
          key={option.value}
          className="hover:bg-surface-muted flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-transparent px-3 py-2 transition-colors"
        >
          <option.icon className="size-4" />
          <span className="text-label-md flex-1 font-medium">{option.label}</span>
          <RadioGroupItem value={option.value} className="shrink-0" />
        </label>
      ))}
    </RadioGroup>
  );
}
