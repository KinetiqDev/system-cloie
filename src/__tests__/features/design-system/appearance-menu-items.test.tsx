/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APPEARANCE_STORAGE_KEY } from "@/features/design-system/lib/appearance";
import { AppearanceProvider } from "@/features/design-system/components/appearance-provider";
import { AppearanceMenuItems } from "@/features/design-system/components/appearance-menu-items";

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

function openAppearanceMenu() {
  render(
    <AppearanceProvider>
      <DropdownMenu>
        <DropdownMenuTrigger>Appearance</DropdownMenuTrigger>
        <DropdownMenuContent>
          <AppearanceMenuItems />
        </DropdownMenuContent>
      </DropdownMenu>
    </AppearanceProvider>
  );

  fireEvent.click(screen.getByRole("button", { name: "Appearance" }));
}

describe("AppearanceMenuItems", () => {
  beforeEach(() => {
    installLocalStorage();
    stubMatchMedia(false);
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
    vi.unstubAllGlobals();
  });

  it("renders text-labeled radio menu items with the stored selection", async () => {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, "dark");
    openAppearanceMenu();

    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "System" })).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute(
        "aria-checked",
        "true"
      )
    );
  });

  it("persists and applies a selection made from the avatar menu", async () => {
    openAppearanceMenu();

    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Light" }));

    await waitFor(() =>
      expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe("light")
    );
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("supports keyboard-only activation of a menu radio item", async () => {
    openAppearanceMenu();

    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
    const system = screen.getByRole("menuitemradio", { name: "System" });
    system.focus();
    fireEvent.keyDown(system, { key: "ArrowDown" });

    const light = screen.getByRole("menuitemradio", { name: "Light" });
    expect(light).toHaveAttribute("data-highlighted");
    fireEvent.keyDown(light, { key: "Enter" });

    await waitFor(() =>
      expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe("light")
    );
  });
});
