/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Topbar } from "@/components/layout/topbar";
import { AppearanceProvider } from "@/features/design-system/components/appearance-provider";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element -- test mock of next/image
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

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
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: initialMatches }))
  );
}

describe("Topbar appearance integration", () => {
  beforeEach(() => {
    installLocalStorage();
    stubMatchMedia(false);
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
    vi.unstubAllGlobals();
  });

  function renderTopbar(appearanceEnabled: boolean) {
    return render(
      <AppearanceProvider enabled={appearanceEnabled}>
        <Topbar
          user={{ name: "Test", email: "test@example.com" }}
          appearanceEnabled={appearanceEnabled}
        />
      </AppearanceProvider>
    );
  }

  it("keeps the profile menu to identity and logout only", async () => {
    renderTopbar(true);

    fireEvent.click(screen.getByRole("button", { name: /T/i }));
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitemradio")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /Appearance settings/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Appearance/i)).not.toBeInTheDocument();
  });

  it("asks for confirmation before logging out instead of signing out immediately", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    try {
      renderTopbar(true);

      fireEvent.click(screen.getByRole("button", { name: /T/i }));
      await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
      fireEvent.click(screen.getByRole("menuitem", { name: "Log out" }));

      await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument());
      expect(screen.getByRole("heading", { name: /Log out of System CLOIE/i })).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Stay signed in" }));
      await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("signs out only after confirming the dialog", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    refreshMock.mockClear();
    try {
      renderTopbar(true);

      fireEvent.click(screen.getByRole("button", { name: /T/i }));
      await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
      fireEvent.click(screen.getByRole("menuitem", { name: "Log out" }));
      await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument());

      fireEvent.click(screen.getByRole("button", { name: /^Log out$/ }));
      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "GET" })
      );
      await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("renders the standalone appearance trigger with all options when enabled", async () => {
    renderTopbar(true);

    fireEvent.click(screen.getByRole("button", { name: "Appearance" }));
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "System" })).toBeInTheDocument();
  });

  it("omits the appearance trigger entirely when disabled", () => {
    renderTopbar(false);

    expect(screen.queryByRole("button", { name: "Appearance" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /T/i })).toBeInTheDocument();
  });
});
