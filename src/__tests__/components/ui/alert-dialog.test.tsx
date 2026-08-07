import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function renderAlertDialog() {
  render(
    <AlertDialog>
      <AlertDialogTrigger>Delete item</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        <AlertDialogAction>Continue</AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  it("uses semantic scrim, border, and surface tokens", async () => {
    renderAlertDialog();
    fireEvent.click(screen.getByRole("button", { name: "Delete item" }));
    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument());

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveClass("bg-popover", "text-popover-foreground", "ring-border");
    expect(dialog).not.toHaveClass("ring-foreground/10");

    const overlay = document.querySelector(".bg-scrim");
    expect(overlay).not.toBeNull();
    expect(overlay).toHaveClass("fixed", "inset-0");
  });

  it("closes on Escape and restores trigger focus", async () => {
    renderAlertDialog();
    const trigger = screen.getByRole("button", { name: "Delete item" });
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument());

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
