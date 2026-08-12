import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

describe("ToggleGroup", () => {
  it.each(["horizontal", "vertical"] as const)(
    "uses Base UI %s orientation for joined outline edges",
    (orientation) => {
      render(
        <ToggleGroup
          aria-label={`${orientation} options`}
          orientation={orientation}
          spacing={0}
          variant="outline"
        >
          <ToggleGroupItem value="one">One</ToggleGroupItem>
          <ToggleGroupItem value="two">Two</ToggleGroupItem>
        </ToggleGroup>
      );

      const group = screen.getByRole("group", { name: `${orientation} options` });
      const items = screen.getAllByRole("button");

      expect(group).toHaveAttribute("data-orientation", orientation);
      expect(group).toHaveAttribute("data-spacing", "0");
      expect(items[0]).toHaveClass(
        `group-data-[orientation=${orientation}]/toggle-group:data-[spacing=0]:first:${
          orientation === "horizontal" ? "rounded-l-lg" : "rounded-t-lg"
        }`
      );
      expect(items[1]).toHaveClass(
        `group-data-[orientation=${orientation}]/toggle-group:data-[spacing=0]:last:${
          orientation === "horizontal" ? "rounded-r-lg" : "rounded-b-lg"
        }`
      );
      expect(items[1]).toHaveClass(
        `group-data-[orientation=${orientation}]/toggle-group:data-[spacing=0]:data-[variant=outline]:${
          orientation === "horizontal" ? "border-l-0" : "border-t-0"
        }`
      );
      expect(items[0]).toHaveClass(
        `group-data-[orientation=${orientation}]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:${
          orientation === "horizontal" ? "border-l" : "border-t"
        }`
      );
    }
  );
});
