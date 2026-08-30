import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function renderSheet() {
  render(
    <Sheet>
      <SheetTrigger>Open sheet</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Sheet title</SheetTitle>
          <SheetDescription>Sheet description</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("uses the semantic scrim token for its overlay", async () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Open sheet" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const overlay = document.querySelector(".bg-scrim");
    expect(overlay).not.toBeNull();
    expect(overlay).toHaveClass("fixed", "inset-0");

    expect(screen.getByRole("dialog")).toHaveClass("bg-popover", "text-popover-foreground");
  });

  it("closes on Escape and restores trigger focus", async () => {
    renderSheet();
    const trigger = screen.getByRole("button", { name: "Open sheet" });
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
