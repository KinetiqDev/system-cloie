import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@/components/ui/responsive-alert-dialog";

/** The dialog shells choose Dialog vs Drawer through `matchMedia`. */
function stubViewport(isDesktop: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: isDesktop,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

function Example({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(true);

  return (
    <ResponsiveAlertDialog open={open} onOpenChange={setOpen}>
      <ResponsiveAlertDialogContent desktopClassName="desktop-width">
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>Discard staged changes?</ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            Staged changes have not been saved.
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel>Keep editing</ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction onClick={onConfirm}>
            Discard and leave
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("ResponsiveAlertDialog", () => {
  it("confirms in a centered alert dialog on desktop", () => {
    stubViewport(true);
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} />);

    const dialog = screen.getByRole("alertdialog", { name: "Discard staged changes?" });
    expect(dialog).toHaveClass("desktop-width");
    expect(dialog).toHaveClass("top-1/2", "left-1/2");

    fireEvent.click(screen.getByRole("button", { name: "Discard and leave" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancelling confirms nothing and dismisses the alert dialog", async () => {
    stubViewport(true);
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog", { name: "Discard staged changes?" })).toBeNull()
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms in a bottom drawer with safe-area actions on mobile", () => {
    stubViewport(false);
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} />);

    const dialog = screen.getByRole("dialog", { name: "Discard staged changes?" });
    expect(dialog).toHaveAttribute("data-swipe-direction", "down");
    // Actions remain stacked above the safe-area padding; gestures do not
    // dismiss a destructive confirmation.
    const footer = screen.getByRole("button", { name: "Discard and leave" }).parentElement;
    expect(footer).toHaveClass("flex-col-reverse", "border-t");

    fireEvent.click(screen.getByRole("button", { name: "Discard and leave" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
