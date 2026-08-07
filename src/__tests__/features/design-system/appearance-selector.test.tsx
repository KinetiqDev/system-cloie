/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APPEARANCE_STORAGE_KEY } from "@/features/design-system/lib/appearance";
import { AppearanceProvider } from "@/features/design-system/components/appearance-provider";
import { AppearanceSelector } from "@/features/design-system/components/appearance-selector";

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

function stubMatchMedia(initialMatches: boolean) {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: initialMatches })));
}

function renderSelector() {
  render(
    <AppearanceProvider>
      <AppearanceSelector />
    </AppearanceProvider>
  );
}

describe("AppearanceSelector", () => {
  beforeEach(() => {
    installLocalStorage();
    stubMatchMedia(false);
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
    vi.unstubAllGlobals();
  });

  it("renders a labeled radio group with visible Light, Dark, and System options", () => {
    renderSelector();

    expect(screen.getByRole("radiogroup", { name: "Appearance" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /system/i })).toBeInTheDocument();
  });

  it("defaults the selection to System when nothing is stored", () => {
    renderSelector();

    expect(screen.getByRole("radio", { name: /system/i })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("reflects the stored preference as the selected radio", async () => {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, "dark");
    renderSelector();

    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /dark/i })).toHaveAttribute(
        "aria-checked",
        "true"
      )
    );
    expect(screen.getByRole("radio", { name: /system/i })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("persists and applies an explicit selection", async () => {
    renderSelector();

    fireEvent.click(screen.getByRole("radio", { name: /dark/i }));

    await waitFor(() =>
      expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe("dark")
    );
    await waitFor(() =>
      expect(document.documentElement.classList.contains("dark")).toBe(true)
    );
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("supports keyboard-only selection with arrow keys", async () => {
    renderSelector();

    const light = screen.getByRole("radio", { name: /light/i });
    fireEvent.focusIn(light);
    fireEvent.keyDown(light, { key: "ArrowDown" });

    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /dark/i })).toHaveAttribute(
        "aria-checked",
        "true"
      )
    );
    expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe("dark");
  });
});
