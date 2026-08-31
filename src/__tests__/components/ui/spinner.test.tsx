import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "@/components/ui/spinner";

describe("Spinner", () => {
  it("renders with role=status and default aria-label", () => {
    render(<Spinner />);
    const spinner = screen.getByRole("status");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute("aria-label", "Loading");
  });

  it("accepts a custom label for screen readers", () => {
    render(<Spinner label="Submitting form" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Submitting form");
  });

  it("applies size classes for each size variant", () => {
    const { rerender } = render(<Spinner size="sm" />);
    expect(screen.getByRole("status")).toHaveClass("size-3");

    rerender(<Spinner size="default" />);
    expect(screen.getByRole("status")).toHaveClass("size-4");

    rerender(<Spinner size="lg" />);
    expect(screen.getByRole("status")).toHaveClass("size-5");
  });

  it("applies the animate-spin class", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toHaveClass("animate-spin");
    expect(screen.getByRole("status")).toHaveClass("motion-reduce:animate-none");
    const reducedMotionArcs = screen
      .getByRole("status")
      .querySelectorAll("[class*='motion-reduce:animate-pulse']");
    expect(reducedMotionArcs.length).toBe(2);
  });

  it("accepts additional className without losing core classes", () => {
    render(<Spinner className="text-primary" />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveClass("animate-spin");
    expect(spinner).toHaveClass("text-primary");
  });

  it("has no Radix or external primitive dependency", () => {
    // The component renders a plain SVG element — no portal, no provider.
    render(<Spinner />);
    const spinner = screen.getByRole("status");
    expect(spinner.tagName.toLowerCase()).toBe("svg");
  });
});
