import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";

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

function Example() {
  const [open, setOpen] = useState(true);

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger render={<Button />}>Open editor</ResponsiveDialogTrigger>
      <ResponsiveDialogContent desktopClassName="desktop-width" mobileClassName="mobile-height">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Edit record</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>Update record details.</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose render={<Button variant="outline" />}>
            Cancel
          </ResponsiveDialogClose>
          <Button>Save</Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("ResponsiveDialog", () => {
  it("renders a centered dialog at desktop widths", async () => {
    stubViewport(true);
    render(<Example />);

    const overlay = await screen.findByRole("dialog", { name: "Edit record" });
    expect(overlay).toHaveClass("desktop-width");
    expect(overlay).not.toHaveClass("mobile-height");
    expect(overlay).toHaveClass("top-1/2", "left-1/2");
  });

  it("renders a bottom drawer with safe-area actions on mobile", async () => {
    stubViewport(false);
    render(<Example />);

    const overlay = await screen.findByRole("dialog", { name: "Edit record" });
    expect(overlay).toHaveClass("mobile-height");
    expect(overlay).toHaveAttribute("data-swipe-direction", "down");

    const footer = screen.getByRole("button", { name: "Save" }).parentElement;
    expect(footer).toHaveClass("flex-col-reverse", "border-t");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
