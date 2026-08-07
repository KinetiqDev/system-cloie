/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveAppearanceAvailabilityMock } = vi.hoisted(() => ({
  resolveAppearanceAvailabilityMock: vi.fn(),
}));

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/features/design-system/services/resolve-appearance-availability", () => ({
  resolveAppearanceAvailability: resolveAppearanceAvailabilityMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

import { AppearanceProvider } from "@/features/design-system/components/appearance-provider";
import AppearanceSettingsPage from "@/app/(app)/settings/appearance/page";

function stubMatchMedia(initialMatches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: initialMatches }))
  );
}

function installLocalStorage() {
  const storageMap = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storageMap.set(key, value);
      }),
    },
  });
}

describe("Settings Appearance route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installLocalStorage();
    stubMatchMedia(false);
    vi.unstubAllGlobals();
  });

  it("fails closed with a not-found response when appearance is disabled", async () => {
    resolveAppearanceAvailabilityMock.mockReturnValue(false);

    await expect(async () => AppearanceSettingsPage()).rejects.toThrow("NOT_FOUND");
  });

  it("renders the theme selector when appearance is enabled", async () => {
    resolveAppearanceAvailabilityMock.mockReturnValue(true);

    render(
      <AppearanceProvider>
        {await AppearanceSettingsPage()}
      </AppearanceProvider>
    );

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Appearance" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Appearance" })).toBeInTheDocument();
  });
});
