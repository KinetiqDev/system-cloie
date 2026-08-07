import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

describe("Tooltip", () => {
  it("uses semantic foreground/background tokens", async () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Helpful hint</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    fireEvent.mouseEnter(screen.getByText("Hover me"));
    await waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')).not.toBeNull());

    const tooltip = document.querySelector('[data-slot="tooltip-content"]') as HTMLElement;
    expect(tooltip).toHaveClass("bg-foreground", "text-background");
    expect(tooltip).not.toHaveClass("bg-popover");
  });
});
