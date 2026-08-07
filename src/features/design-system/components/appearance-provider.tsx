"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  readStoredAppearance,
  resolveAppearance,
  writeStoredAppearance,
} from "@/features/design-system/lib/appearance";
import type {
  AppearancePreference,
  ResolvedAppearance,
} from "@/features/design-system/lib/appearance";

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

type AppearanceContextValue = {
  preference: AppearancePreference | null;
  resolved: ResolvedAppearance;
  setPreference: (preference: AppearancePreference) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }
  return context;
}

function readSystemPrefersDark(): boolean {
  try {
    return window.matchMedia(SYSTEM_DARK_QUERY).matches;
  } catch {
    return false;
  }
}

function readBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

type HydratedAppearance = {
  preference: AppearancePreference | null;
  systemPrefersDark: boolean;
};

export function AppearanceProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const [hydrated, setHydrated] = useState<HydratedAppearance | null>(null);
  const preference = hydrated?.preference ?? null;
  const systemPrefersDark = hydrated?.systemPrefersDark ?? false;
  const ready = hydrated !== null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration read of browser-only state per ADR 0010; must not run during SSR
    setHydrated({
      preference: enabled ? readStoredAppearance(readBrowserStorage()) : null,
      systemPrefersDark: readSystemPrefersDark(),
    });
  }, [enabled]);

  useEffect(() => {
    if (!ready || !enabled || (preference !== null && preference !== "system")) {
      return;
    }

    if (typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia(SYSTEM_DARK_QUERY);
    const applySystemPreference = (event: MediaQueryListEvent) => {
      setHydrated((current) =>
        current
          ? { ...current, systemPrefersDark: event.matches }
          : current
      );
    };
    media.addEventListener("change", applySystemPreference);
    return () => {
      media.removeEventListener("change", applySystemPreference);
    };
  }, [preference, ready, enabled]);

  const resolved = enabled
    ? resolveAppearance(preference, systemPrefersDark)
    : "light";

  useEffect(() => {
    if (!ready) {
      return;
    }
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  }, [ready, resolved]);

  const setPreference = useCallback(
    (next: AppearancePreference) => {
      if (!enabled) {
        return;
      }
      setHydrated((current) => (current ? { ...current, preference: next } : current));
      writeStoredAppearance(readBrowserStorage(), next);
    },
    [enabled]
  );

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference]
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}
