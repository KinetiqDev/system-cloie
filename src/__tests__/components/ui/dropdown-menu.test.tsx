import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function renderDropdownMenu() {
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Item one</DropdownMenuItem>
        <DropdownMenuItem>Item two</DropdownMenuItem>
        <DropdownMenuSeparator />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenu", () => {
  it("uses semantic surface and border tokens", async () => {
    renderDropdownMenu();
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

    const menu = screen.getByRole("menu");
    expect(menu).toHaveClass("bg-popover", "text-popover-foreground", "ring-border");
    expect(menu).not.toHaveClass("ring-foreground/10");
  });

  it("keeps menu items keyboard navigable", async () => {
    renderDropdownMenu();
    const trigger = screen.getByRole("button", { name: "Actions" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Item one" })).toHaveAttribute("data-highlighted")
    );

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("keeps menu items at a 44px touch row height on coarse pointers", async () => {
    renderDropdownMenu();
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    const item = await screen.findByRole("menuitem", { name: "Item one" });
    expect(item).toHaveClass("pointer-coarse:min-h-11");
  });
});
