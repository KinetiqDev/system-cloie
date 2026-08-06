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

    /**
     * cta-success: deprecated compatibility variant retained until slice 20.
     * Retokenized through semantic success family — no raw hex colors.
     */
    it("applies semantic success token classes for cta-success and contains no raw hex", () => {
      render(<Button variant="cta-success">Publish</Button>);
      const btn = screen.getByRole("button");
      expect(btn).toHaveClass("bg-status-success-main");
      expect(btn).toHaveClass("text-status-success-on");
      const ctaSuccessClasses = buttonVariants({ variant: "cta-success" });
      expect(ctaSuccessClasses).not.toMatch(/#[0-9a-fA-F]{3,6}/);
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
      render(<Button size="icon" aria-label="Close">✕</Button>);
      expect(screen.getByRole("button")).toHaveClass("size-8");
    });
  });

  describe("loading affordance", () => {
    it("renders a spinner with role=status when loading=true", () => {
      render(<Button loading>Save</Button>);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("preserves the label text in the DOM when loading to maintain width", () => {
      render(<Button loading>Save Changes</Button>);
      // Label is rendered inside a span (aria-hidden) to preserve layout width.
      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });

    it("sets disabled and aria-busy when loading", () => {
      render(<Button loading>Submit</Button>);
      const btn = screen.getByRole("button");
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("aria-busy", "true");
    });

    it("uses a custom loadingLabel for the spinner aria-label", () => {
      render(<Button loading loadingLabel="Submitting form">Submit</Button>);
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Submitting form"
      );
    });

    it("does not render a spinner when loading=false", () => {
      render(<Button>Submit</Button>);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
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
