import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "@/components/ui/button";

describe("Button", () => {
  describe("variant classes", () => {
    it("applies bg-primary for the default variant", () => {
      render(<Button>Save</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-primary");
    });

    it("applies secondary neutral classes for the secondary variant", () => {
      render(<Button variant="secondary">Cancel</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-secondary");
    });

    it("applies outline classes", () => {
      render(<Button variant="outline">Filter</Button>);
      expect(screen.getByRole("button")).toHaveClass("border-border");
    });

    it("applies ghost classes", () => {
      render(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole("button")).toHaveClass("hover:bg-muted");
    });

    it("applies destructive soft classes", () => {
      render(<Button variant="destructive">Delete</Button>);
      const btn = screen.getByRole("button");
      expect(btn).toHaveClass("text-destructive");
    });

    it("applies link classes", () => {
      render(<Button variant="link">Details</Button>);
      expect(screen.getByRole("button")).toHaveClass("underline-offset-4");
    });

    /**
     * brand-accent: specialized ACD cyan, separate from default primary.
     * Uses --brand-accent* semantic token family.
     */
    it("applies brand-accent semantic token classes for the brand-accent variant", () => {
      render(<Button variant="brand-accent">Learn More</Button>);
      const btn = screen.getByRole("button");
      expect(btn).toHaveClass("bg-brand-accent");
      expect(btn).toHaveClass("text-brand-accent-on");
    });

    it("brand-accent does not share classes with the default primary variant", () => {
      const defaultClasses = buttonVariants({ variant: "default" });
      const brandAccentClasses = buttonVariants({ variant: "brand-accent" });
      expect(defaultClasses).not.toEqual(brandAccentClasses);
      expect(brandAccentClasses).not.toContain("bg-primary");
    });

    it("no longer exposes the retired success variant", () => {
      const classes = buttonVariants({ variant: "retired-success" } as never);
      expect(classes).not.toContain("bg-status-success-main");
      expect(classes).not.toContain("text-status-success-on");
    });
  });

  describe("size classes", () => {
    it("applies default size h-8", () => {
      render(<Button>Action</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-8");
    });

    it("applies xs size h-6", () => {
      render(<Button size="xs">Tiny</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-6");
    });

    it("applies sm size h-7", () => {
      render(<Button size="sm">Small</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-7");
    });

    it("applies lg size h-9", () => {
      render(<Button size="lg">Large</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-9");
    });

    it("applies icon sizes", () => {
      render(
        <Button size="icon" aria-label="Close">
          ✕
        </Button>
      );
      expect(screen.getByRole("button")).toHaveClass("size-8");
    });

    it.each([
      ["default", "pointer-coarse:h-11"],
      ["xs", "pointer-coarse:h-11"],
      ["sm", "pointer-coarse:h-11"],
      ["lg", "pointer-coarse:h-12"],
      ["icon", "pointer-coarse:size-11"],
      ["icon-xs", "pointer-coarse:size-11"],
      ["icon-sm", "pointer-coarse:size-11"],
      ["icon-lg", "pointer-coarse:size-12"],
    ] as const)("size %s carries a coarse-pointer touch target override", (size, coarseClass) => {
      expect(buttonVariants({ size })).toContain(coarseClass);
    });
  });

  describe("loading affordance", () => {
    it("spinner overlays the label without adding a sibling flex child (width preservation)", () => {
      // The button must have exactly one direct child element when loading
      // so the spinner does not sit beside the label and expand intrinsic width.
      // The wrapper is position:relative; the spinner is position:absolute inside it.
      render(<Button loading>Save</Button>);
      const btn = screen.getByRole("button");
      expect(btn.children).toHaveLength(1);
      const wrapper = btn.children[0];
      expect(wrapper).toHaveClass("relative");
    });

    it("renders an SVG spinner when loading=true", () => {
      render(<Button loading>Save</Button>);
      expect(document.querySelector("svg")).toBeInTheDocument();
    });

    it("preserves the label text as the button's accessible name when loading", () => {
      render(<Button loading>Save Changes</Button>);
      // Label span is NOT aria-hidden — button retains its original accessible name.
      // AT announces "Save Changes, busy, dimmed" — not an anonymous loading state.
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    });

    it("sets disabled and aria-busy when loading", () => {
      render(<Button loading>Submit</Button>);
      const btn = screen.getByRole("button");
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("aria-busy", "true");
    });

    it("spinner is aria-hidden so AT does not double-announce a loading label", () => {
      render(<Button loading>Submit</Button>);
      // aria-busy on the button carries the loading state; spinner is decorative.
      const svg = document.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });

    it("does not render an SVG spinner when loading=false", () => {
      render(<Button>Submit</Button>);
      expect(document.querySelector("svg")).not.toBeInTheDocument();
    });

    it("is disabled when the disabled prop is set", () => {
      render(<Button disabled>Inactive</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("no Radix dependency", () => {
    it("renders a native button element (Base UI ButtonPrimitive)", () => {
      render(<Button>Click</Button>);
      expect(screen.getByRole("button").tagName.toLowerCase()).toBe("button");
    });
  });
});
