import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Switch } from "@/components/ui/switch";

describe("Switch", () => {
  describe("semantic retokening", () => {
    it("renders with the semantic input surface for the unchecked state", () => {
      render(<Switch aria-label="Email me about new courses" />);
      const sw = screen.getByRole("switch");
      expect(sw).toHaveClass("bg-surface-input");
      expect(sw).toHaveClass("data-unchecked:bg-surface-input");
    });

    it("does not retain raw-theme dark palette selectors that bypass the semantic tokens on the root", () => {
      render(<Switch aria-label="Notify" />);
      const sw = screen.getByRole("switch");
      const rootClasses = sw.getAttribute("class") ?? "";
      expect(rootClasses).not.toMatch(/\bdark:/);
    });

    it("keeps the thumb visually distinct from the track via the Base UI dark state selectors", () => {
      // design.md §1 row permits `dark:` selectors that adjust Base UI state.
      // The thumb uses dark variants of primary-foreground / foreground so that
      // it stays distinguishable from the (dark) track surface.
      render(<Switch aria-label="Notify" />);
      const sw = screen.getByRole("switch");
      const thumb = sw.querySelector('[data-slot="switch-thumb"]');
      expect(thumb).toBeInTheDocument();
      expect(thumb).toHaveClass("dark:data-checked:bg-primary-foreground");
      expect(thumb).toHaveClass("dark:data-unchecked:bg-foreground");
    });
  });

  describe("programmatic checked state uses the primary role", () => {
    it("applies primary background via Base UI data-checked state", () => {
      render(<Switch defaultChecked aria-label="Notify" />);
      const sw = screen.getByRole("switch", { checked: true });
      expect(sw).toHaveClass("data-checked:bg-primary");
      expect(sw).toHaveAttribute("data-checked");
    });

    it("exposes the checked state via aria-checked", () => {
      render(<Switch defaultChecked aria-label="Notify" />);
      expect(screen.getByRole("switch", { checked: true })).toBeInTheDocument();
    });
  });

  describe("programmatic invalid / disabled state", () => {
    it("exposes aria-invalid and the destructive ring family when invalid", () => {
      render(<Switch aria-invalid="true" aria-label="Required" />);
      const sw = screen.getByRole("switch");
      expect(sw).toHaveAttribute("aria-invalid", "true");
      expect(sw).toHaveClass("aria-invalid:border-destructive");
      expect(sw).toHaveClass("aria-invalid:ring-destructive/20");
    });

    it("supports the disabled attribute with non-color cue", () => {
      render(<Switch disabled aria-label="Locked" />);
      const sw = screen.getByRole("switch");
      expect(sw).toHaveAttribute("data-disabled");
      expect(sw).toHaveClass("data-disabled:cursor-not-allowed");
      expect(sw).toHaveClass("data-disabled:opacity-50");
    });
  });

  describe("focus ring", () => {
    it("uses the dedicated ring semantic role", () => {
      render(<Switch aria-label="Notify" />);
      const sw = screen.getByRole("switch");
      expect(sw).toHaveClass("focus-visible:border-ring");
      expect(sw).toHaveClass("focus-visible:ring-ring/50");
      expect(sw).toHaveClass("focus-visible:ring-3");
    });
  });

  describe("size variants", () => {
    it("applies the sm data-size for compact switches", () => {
      render(<Switch size="sm" aria-label="Compact" />);
      expect(screen.getByRole("switch")).toHaveAttribute("data-size", "sm");
    });

    it("defaults to the default data-size", () => {
      render(<Switch aria-label="Default" />);
      expect(screen.getByRole("switch")).toHaveAttribute("data-size", "default");
    });
  });

  describe("Base UI exclusive", () => {
    it("renders via Base UI with role=switch", () => {
      render(<Switch aria-label="Notify" />);
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });
  });
});
