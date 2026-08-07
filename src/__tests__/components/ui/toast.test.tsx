import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, showToast } from "@/components/ui/toast";

const pathname = "/app/planner";
let searchParams: URLSearchParams;
let replaceState: ReturnType<typeof vi.fn<(data: unknown, unused: string, url?: string | URL | null) => void>>;

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => searchParams,
}));

function toastElement(message: string): HTMLElement {
  return screen.getByText(message).parentElement as HTMLElement;
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchParams = new URLSearchParams();
    replaceState = vi.fn();
    vi.spyOn(window.history, "replaceState").mockImplementation(
      (...args: Parameters<typeof window.history.replaceState>) => replaceState(...args)
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders a success toast and auto-dismisses it after 4500ms", () => {
    render(<ToastProvider />);

    act(() => showToast("Saved successfully"));
    expect(toastElement("Saved successfully")).toHaveClass("bg-surface", "border-success/40", "text-success");

    act(() => vi.advanceTimersByTime(4500));
    expect(screen.queryByText("Saved successfully")).not.toBeInTheDocument();
  });

  it("renders error and warning toasts with semantic status tokens", () => {
    render(<ToastProvider />);

    act(() => showToast("Something failed", "error"));
    expect(toastElement("Something failed")).toHaveClass("border-danger/40", "text-danger");

    act(() => showToast("Heads up", "warning"));
    expect(toastElement("Heads up")).toHaveClass("border-warning/40", "text-warning");
  });

  it("supports the information kind with icon and semantic tokens (non-color-only)", () => {
    render(<ToastProvider />);

    act(() => showToast("Note: draft saved", "information"));

    const toast = toastElement("Note: draft saved");
    expect(toast).toHaveClass("border-info/40", "text-info");
    expect(toast).not.toHaveClass("border-green-200", "border-yellow-200", "border-red-200");
    expect(document.querySelector("svg.lucide-info")).toBeInTheDocument();
  });

  it("shows multiple toasts at once", () => {
    render(<ToastProvider />);

    act(() => {
      showToast("First");
      showToast("Second", "warning");
    });

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  describe("URL toast consumption", () => {
    it("maps toastType=error to the error kind and cleans the query", () => {
      searchParams = new URLSearchParams("toast=Sync failed&toastType=error");
      render(<ToastProvider />);

      expect(toastElement("Sync failed")).toHaveClass("border-danger/40", "text-danger");
      expect(replaceState).toHaveBeenCalledWith(null, "", pathname);
    });

    it("maps toastType=warning to the warning kind", () => {
      searchParams = new URLSearchParams("toast=Action required&toastType=warning");
      render(<ToastProvider />);

      expect(toastElement("Action required")).toHaveClass("border-warning/40", "text-warning");
    });

    it("maps toastType=info to the information kind", () => {
      searchParams = new URLSearchParams("toast=Draft restored&toastType=info");
      render(<ToastProvider />);

      expect(toastElement("Draft restored")).toHaveClass("border-info/40", "text-info");
    });

    it("defaults to success for a plain toast param", () => {
      searchParams = new URLSearchParams("toast=Welcome");
      render(<ToastProvider />);

      expect(toastElement("Welcome")).toHaveClass("border-success/40", "text-success");
    });
  });
});
