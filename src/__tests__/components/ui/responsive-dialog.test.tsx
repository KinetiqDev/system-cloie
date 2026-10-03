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
  it.each([true, false])("dismisses with Escape at desktop=%s", async (isDesktop) => {
    stubViewport(isDesktop);
    render(<Example />);

    expect(await screen.findByRole("dialog", { name: "Edit record" })).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it.each([true, false])("dismisses with Cancel at desktop=%s", async (isDesktop) => {
    stubViewport(isDesktop);
    render(<Example />);

    await screen.findByRole("dialog", { name: "Edit record" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
