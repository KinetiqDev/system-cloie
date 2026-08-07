/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPEARANCE_STORAGE_KEY,
} from "@/features/design-system/lib/appearance";
import {
  AppearanceProvider,
  useAppearance,
} from "@/features/design-system/components/appearance-provider";

function stubMatchMedia(initialMatches: boolean) {
  const changeListeners: Array<(event: { matches: boolean }) => void> = [];
  const media = {
    matches: initialMatches,
    addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
      changeListeners.push(listener);
    },
    removeEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
      const index = changeListeners.indexOf(listener);
      if (index >= 0) {
        changeListeners.splice(index, 1);
      }
    },
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media)
  );
  return {
    media,
    setMatches(matches: boolean) {
      media.matches = matches;
      changeListeners.forEach((listener) => listener({ matches }));
    },
  };
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
  return storageMap;
}

function AppearanceProbe() {
  const { preference, resolved, setPreference } = useAppearance();
  return (
    <div>
      <output data-testid="preference">{preference ?? "none"}</output>
      <output data-testid="resolved">{resolved}</output>
      <button type="button" onClick={() => setPreference("dark")}>
        Choose dark
      </button>
      <button type="button" onClick={() => setPreference("light")}>
        Choose light
      </button>
      <button type="button" onClick={() => setPreference("system")}>
        Choose system
      </button>
    </div>
  );
}

function renderProvider() {
  render(
    <AppearanceProvider>
      <AppearanceProbe />
    </AppearanceProvider>
  );
}

function rootClass() {
  return document.documentElement.classList.contains("dark");
}

describe("AppearanceProvider", () => {
  beforeEach(() => {
    installLocalStorage();
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
    vi.unstubAllGlobals();
  });

  it("applies a persisted explicit preference after hydration", async () => {
    stubMatchMedia(false);
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, "dark");
    renderProvider();

    await waitFor(() => expect(rootClass()).toBe(true));
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(screen.getByTestId("preference")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
  });

  it("lets an explicit light preference override a dark operating system", async () => {
    stubMatchMedia(true);
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, "light");
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("preference")).toHaveTextContent("light"));
    expect(rootClass()).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("resolves System from the operating system without persisting it", async () => {
    stubMatchMedia(true);
    renderProvider();

    await waitFor(() => expect(rootClass()).toBe(true));
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBeNull();
  });

  it("follows operating-system changes while System is selected", async () => {
    const os = stubMatchMedia(false);
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, "system");
    renderProvider();

    await waitFor(() => expect(rootClass()).toBe(false));
    os.setMatches(true);
    await waitFor(() => expect(rootClass()).toBe(true));
    expect(document.documentElement.style.colorScheme).toBe("dark");

    os.setMatches(false);
    await waitFor(() => expect(rootClass()).toBe(false));
  });

  it("stops following the operating system after an explicit selection", async () => {
    const os = stubMatchMedia(true);
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, "system");
    renderProvider();

    await waitFor(() => expect(rootClass()).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Choose light" }));
    await waitFor(() => expect(rootClass()).toBe(false));

    os.setMatches(true);
    expect(rootClass()).toBe(false);
  });

  it("persists only explicit selections under the stable key", async () => {
    stubMatchMedia(false);
    renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "Choose dark" }));
    await waitFor(() =>
      expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe("dark")
    );
    await waitFor(() => expect(rootClass()).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Choose system" }));
    await waitFor(() =>
      expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe("system")
    );
  });

  it("stays usable when storage read and write are blocked", async () => {
    stubMatchMedia(true);
    vi.mocked(window.localStorage.getItem).mockImplementation(() => {
      throw new Error("storage blocked");
    });
    renderProvider();

    await waitFor(() => expect(rootClass()).toBe(true));

    vi.mocked(window.localStorage.setItem).mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: "Choose light" }))
    ).not.toThrow();
    await waitFor(() => expect(rootClass()).toBe(false));
  });

  it("preserves local child state when appearance changes", async () => {
    stubMatchMedia(false);
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, "system");

    function StatefulChild() {
      const [value, setValue] = useState("draft");
      return (
        <input
          aria-label="Draft"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      );
    }

    function StatefulProbe() {
      const { setPreference } = useAppearance();
      return (
        <div>
          <StatefulChild />
          <button type="button" onClick={() => setPreference("dark")}>
            Choose dark
          </button>
        </div>
      );
    }

    render(
      <AppearanceProvider>
        <StatefulProbe />
      </AppearanceProvider>
    );

    const input = screen.getByRole("textbox", { name: "Draft" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "edited" } });
    fireEvent.click(screen.getByRole("button", { name: "Choose dark" }));

    await waitFor(() => expect(rootClass()).toBe(true));
    expect(input.value).toBe("edited");
  });

  it("forces Light and ignores stored or requested preferences when disabled", async () => {
    stubMatchMedia(true);
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, "dark");

    render(
      <AppearanceProvider enabled={false}>
        <AppearanceProbe />
      </AppearanceProvider>
    );

    await waitFor(() => expect(screen.getByTestId("resolved")).toHaveTextContent("light"));
    expect(rootClass()).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");

    fireEvent.click(screen.getByRole("button", { name: "Choose dark" }));
    expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe("dark");
    expect(rootClass()).toBe(false);
  });
});
