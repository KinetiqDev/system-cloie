/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APPEARANCE_STORAGE_KEY } from "@/features/design-system/lib/appearance";
import { AppearanceProvider } from "@/features/design-system/components/appearance-provider";
import { AppearanceMenuTrigger } from "@/features/design-system/components/appearance-menu-trigger";

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

function renderTrigger(enabled: boolean, preference?: string) {
  if (preference) {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, preference);
  }
  return render(
    <AppearanceProvider enabled={enabled}>
      <AppearanceMenuTrigger enabled={enabled} />
    </AppearanceProvider>
  );
}

describe("AppearanceMenuTrigger", () => {
  beforeEach(() => {
    installLocalStorage();
    stubMatchMedia(false);
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
    vi.unstubAllGlobals();
  });

  it("renders nothing when appearance is unavailable", () => {
    renderTrigger(false);
    expect(screen.queryByRole("button", { name: "Appearance" })).not.toBeInTheDocument();
  });

  it("opens a larger dropdown with all three options", async () => {
    renderTrigger(true);
    fireEvent.click(screen.getByRole("button", { name: "Appearance" }));

    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
    expect(screen.getByRole("menuitemradio", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "System" })).toBeInTheDocument();
  });

  it("reflects the stored preference icon on the trigger", () => {
    renderTrigger(true, "dark");
    expect(document.querySelector(".lucide-moon")).not.toBeNull();

    renderTrigger(true, "light");
    expect(document.querySelector(".lucide-sun")).not.toBeNull();
  });

  it("persists and applies a selection", async () => {
    renderTrigger(true);
    fireEvent.click(screen.getByRole("button", { name: "Appearance" }));
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Dark" }));

    await waitFor(() =>
      expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe("dark")
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
