import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

function renderDrawer() {
  render(
    <Drawer>
      <DrawerTrigger>Open drawer</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Drawer title</DrawerTitle>
          <DrawerDescription>Drawer description</DrawerDescription>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  );
}

describe("Drawer", () => {
  it("uses the semantic scrim token for its overlay", async () => {
    renderDrawer();
    fireEvent.click(screen.getByRole("button", { name: "Open drawer" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const overlay = document.querySelector(".bg-scrim");
    expect(overlay).not.toBeNull();
    expect(overlay).toHaveClass("fixed", "inset-0");

    expect(screen.getByRole("dialog")).toHaveClass("bg-popover", "text-popover-foreground");
  });

  it("closes on Escape and restores trigger focus", async () => {
    renderDrawer();
    const trigger = screen.getByRole("button", { name: "Open drawer" });
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
