import { Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const APPEARANCE_STORAGE_KEY = "cloie:appearance";

export const APPEARANCE_VALUES = ["light", "dark", "system"] as const;

export type AppearancePreference = (typeof APPEARANCE_VALUES)[number];

export type ResolvedAppearance = "light" | "dark";

export const APPEARANCE_OPTIONS: ReadonlyArray<{
  value: AppearancePreference;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function parseAppearance(value: string | null | undefined): AppearancePreference | null {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return null;
}

export function resolveAppearance(
  preference: AppearancePreference | null | undefined,
  systemPrefersDark: boolean
): ResolvedAppearance {
  if (preference === "light" || preference === "dark") {
    return preference;
  }
  return systemPrefersDark ? "dark" : "light";
}

export function readStoredAppearance(
  storage: Pick<Storage, "getItem"> | null
): AppearancePreference | null {
  if (!storage) {
    return null;
  }
  try {
    return parseAppearance(storage.getItem(APPEARANCE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredAppearance(
  storage: Pick<Storage, "setItem"> | null,
  preference: AppearancePreference
): boolean {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(APPEARANCE_STORAGE_KEY, preference);
    return true;
  } catch {
    return false;
  }
}
