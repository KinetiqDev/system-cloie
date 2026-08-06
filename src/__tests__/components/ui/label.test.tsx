import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Label } from "@/components/ui/label";

describe("Label", () => {
  describe("semantic retokening", () => {
    it("renders with the semantic foreground role", () => {
      render(<Label htmlFor="name">Full name</Label>);
      const label = screen.getByText("Full name");
      expect(label).toHaveClass("text-foreground");
      expect(label).toHaveClass("font-medium");
    });

    it("preserves the structural flex anatomy so wrapping labels align controls", () => {
      render(
        <Label htmlFor="name">
          Full name
          <input id="name" type="text" />
        </Label>
      );
      const label = screen.getByText("Full name");
      expect(label).toHaveClass("flex");
      expect(label).toHaveClass("items-center");
      expect(label).toHaveClass("gap-2");
    });

    it("uses a stable data-slot for layout queries", () => {
      render(<Label htmlFor="name">Full name</Label>);
      expect(screen.getByText("Full name")).toHaveAttribute("data-slot", "label");
    });
  });

  describe("visible label binding", () => {
    it("associates a control via htmlFor", () => {
      render(
        <>
          <Label htmlFor="email">Email</Label>
          <input id="email" type="email" />
        </>
      );
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    it("supports a wrapping label that contains its target input", () => {
      render(
        <Label>
          Username
          <input type="text" />
        </Label>
      );
      expect(screen.getByLabelText("Username")).toBeInTheDocument();
    });
  });

  describe("programmatic disabled state", () => {
    it("dims and disables pointer events when the group is set to disabled", () => {
      render(
        <div data-disabled="true" className="group/field">
          <Label htmlFor="x">Field</Label>
        </div>
      );
      const label = screen.getByText("Field");
      expect(label).toHaveClass("group-data-[disabled=true]:pointer-events-none");
      expect(label).toHaveClass("group-data-[disabled=true]:opacity-50");
    });

    it("dims the label when the peer input is disabled (peer state)", () => {
      render(
        <span className="peer">
          <Label htmlFor="x">Field</Label>
          <input id="x" type="text" disabled />
        </span>
      );
      const label = screen.getByText("Field");
      expect(label).toHaveClass("peer-disabled:cursor-not-allowed");
      expect(label).toHaveClass("peer-disabled:opacity-50");
    });
  });
});
