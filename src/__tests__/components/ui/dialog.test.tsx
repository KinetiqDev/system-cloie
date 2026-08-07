import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function renderDialog() {
  render(
    <Dialog>
      <DialogTrigger>Open dialog</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog description</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("uses semantic scrim, border, and surface tokens", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("bg-popover", "text-popover-foreground", "ring-border");
    expect(dialog).not.toHaveClass("ring-foreground/10");

    const overlay = document.querySelector(".bg-scrim");
    expect(overlay).not.toBeNull();
    expect(overlay).toHaveClass("fixed", "inset-0");
  });

  it("closes on Escape and restores trigger focus", async () => {
    renderDialog();
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
