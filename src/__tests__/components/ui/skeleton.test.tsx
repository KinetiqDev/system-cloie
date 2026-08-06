import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  describe("semantic retokening", () => {
    it("uses the semantic muted surface for the placeholder fill", () => {
      const { container } = render(<Skeleton data-testid="skel" />);
      const skeleton = container.querySelector('[data-slot="skeleton"]');
      expect(skeleton).not.toBeNull();
      expect(skeleton).toHaveClass("bg-muted");
    });

    it("preserves the loading affordance with the animate-pulse utility", () => {
      const { container } = render(<Skeleton data-testid="skel" />);
      const skeleton = container.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass("animate-pulse");
    });

    it("applies the rounded-md radius for a contained placeholder", () => {
      const { container } = render(<Skeleton data-testid="skel" />);
      const skeleton = container.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass("rounded-md");
    });

    it("does not retain raw-theme dark palette selectors that bypass the semantic tokens", () => {
      const { container } = render(<Skeleton data-testid="skel" />);
      const skeleton = container.querySelector('[data-slot="skeleton"]');
      const className = skeleton?.getAttribute("class") ?? "";
      expect(className).not.toMatch(/\bdark:/);
    });
  });

  describe("non-color cues for state", () => {
    it("uses animation as a non-color cue that loading is in progress", () => {
      const { container } = render(<Skeleton data-testid="skel" />);
      const skeleton = container.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass("animate-pulse");
    });
  });

  describe("API passthrough", () => {
    it("forwards arbitrary className to the rendered element", () => {
      const { container } = render(<Skeleton className="h-6 w-1/2" />);
      const skeleton = container.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass("h-6");
      expect(skeleton).toHaveClass("w-1/2");
    });
  });
});
