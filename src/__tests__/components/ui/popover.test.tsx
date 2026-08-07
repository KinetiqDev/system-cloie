import { readFileSync } from "fs";
import { resolve } from "path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

describe("Popover", () => {
  it("is implemented on Base UI only with no Radix dependency", () => {
    const source = readFileSync(resolve(__dirname, "../../../components/ui/popover.tsx"), "utf-8");
    expect(source).toContain('from "@base-ui/react/popover"');
    expect(source).not.toMatch(/@radix-ui/);
  });

  it("uses semantic surface and border tokens", async () => {
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent>Popover content</PopoverContent>
      </Popover>
    );

    fireEvent.click(screen.getByRole("button", { name: "Open popover" }));
    await waitFor(() => expect(screen.getByText("Popover content")).toBeInTheDocument());

    const content = screen.getByText("Popover content");
    expect(content).toHaveClass("bg-popover", "text-popover-foreground", "ring-border");
    expect(content).not.toHaveClass("ring-foreground/10");
  });

  it("closes on Escape and restores trigger focus", async () => {
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent>Popover content</PopoverContent>
      </Popover>
    );

    const trigger = screen.getByRole("button", { name: "Open popover" });
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByText("Popover content")).toBeInTheDocument());

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Popover content")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
